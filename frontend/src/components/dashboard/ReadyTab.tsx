import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Order, OrderType, OrderStatus } from '../../backend';
import {
  useGetReadyOrders,
  useGetAllOrders,
  useDeleteReadyOrder,
  useBatchReturnReadyOrders,
} from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';

function formatDate(ts: bigint | undefined | null): string {
  if (!ts) return '—';
  const ms = Number(ts) / 1_000_000;
  if (!ms || ms <= 0) return '—';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function getOrderTypeLabel(type: OrderType): string {
  switch (type) {
    case OrderType.RB: return 'RB';
    case OrderType.CO: return 'CO';
    default: return 'SO';
  }
}

export default function ReadyTab() {
  const { actor } = useActor();
  const { data: readyOrders = [], isLoading, refetch: refetchReadyOrders } = useGetReadyOrders();
  const { data: allOrders = [], refetch: refetchAllOrders } = useGetAllOrders();
  const deleteReadyOrderMutation = useDeleteReadyOrder();
  // useBatchReturnReadyOrders is kept for query invalidation side-effects
  const batchReturnMutation = useBatchReturnReadyOrders();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return readyOrders;
    const q = searchText.toLowerCase();
    return readyOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName ?? '').toLowerCase().includes(q) ||
        (o.karigarName ?? '').toLowerCase().includes(q)
    );
  }, [readyOrders, searchText]);

  const selectedOrders = useMemo(
    () => filteredOrders.filter((o) => selectedIds.has(o.orderId)),
    [filteredOrders, selectedIds]
  );

  const isOperating = isReturning || deleteReadyOrderMutation.isPending || batchReturnMutation.isPending;

  function toggleSelect(orderId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.orderId)));
    }
  }

  /**
   * Return selected orders to Pending.
   *
   * Key fix: always refetch fresh data first, then for each selected orderNo
   * pass the TOTAL qty of ALL ready orders for that orderNo (not just selected).
   * The backend's returnOrdersToPending checks totalReadyQty == returnedQty,
   * so we must match exactly what the backend sees.
   *
   * For RB orders that were partially supplied (have originalOrderId), we also
   * delete the pending remainder and add its qty to the total so the full
   * original quantity is restored as a single pending row.
   */
  async function handleReturn() {
    if (selectedOrders.length === 0) {
      toast.error('No orders selected');
      return;
    }
    if (!actor) {
      toast.error('Backend not ready');
      return;
    }

    setIsReturning(true);
    try {
      // Step 1: Refetch fresh data from the backend
      const [freshReadyResult, freshAllResult] = await Promise.all([
        refetchReadyOrders(),
        refetchAllOrders(),
      ]);

      const freshReadyOrders: Order[] = freshReadyResult.data ?? [];
      const freshAllOrders: Order[] = freshAllResult.data ?? [];

      // Step 2: Identify which orderNos were selected
      const freshSelectedOrders = freshReadyOrders.filter((o) =>
        selectedIds.has(o.orderId)
      );

      if (freshSelectedOrders.length === 0) {
        toast.error('Selected orders not found. Please refresh and try again.');
        return;
      }

      const selectedOrderNos = new Set(freshSelectedOrders.map((o) => o.orderNo));

      // Step 3: For each selected orderNo, sum ALL ready orders for that orderNo.
      // This ensures the qty we pass matches what the backend will sum.
      const readyQtyByOrderNo = new Map<string, bigint>();
      for (const order of freshReadyOrders) {
        if (selectedOrderNos.has(order.orderNo)) {
          const current = readyQtyByOrderNo.get(order.orderNo) ?? 0n;
          readyQtyByOrderNo.set(order.orderNo, current + order.quantity);
        }
      }

      // Step 4: For RB orders with a pending remainder (partial supply), delete
      // the remainder and add its qty so the full quantity is restored.
      const pendingRemainderIds: string[] = [];
      for (const order of freshSelectedOrders) {
        if (order.orderType === OrderType.RB) {
          // Find the pending remainder: same orderNo, Pending, no originalOrderId,
          // and orderId is NOT one of the ready orders we're returning
          const readyIdsForOrderNo = new Set(
            freshReadyOrders
              .filter((o) => o.orderNo === order.orderNo)
              .map((o) => o.orderId)
          );
          const pendingRemainder = freshAllOrders.find(
            (o) =>
              o.orderNo === order.orderNo &&
              o.status === OrderStatus.Pending &&
              !o.originalOrderId &&
              !readyIdsForOrderNo.has(o.orderId)
          );
          if (pendingRemainder && !pendingRemainderIds.includes(pendingRemainder.orderId)) {
            pendingRemainderIds.push(pendingRemainder.orderId);
            const current = readyQtyByOrderNo.get(order.orderNo) ?? 0n;
            readyQtyByOrderNo.set(order.orderNo, current + pendingRemainder.quantity);
          }
        }
      }

      // Step 5: Delete pending remainders first
      if (pendingRemainderIds.length > 0) {
        await actor.batchDeleteOrders(pendingRemainderIds);
      }

      // Step 6: Build and send return requests
      const orderRequests: Array<[string, bigint]> = Array.from(readyQtyByOrderNo.entries());

      if (orderRequests.length === 0) {
        toast.error('No valid orders to return');
        return;
      }

      await actor.batchReturnOrdersToPending(orderRequests);

      toast.success(`${orderRequests.length} order(s) returned to Pending`);
      setSelectedIds(new Set());

      // Step 7: Refresh data
      await Promise.all([refetchReadyOrders(), refetchAllOrders()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to return orders: ${msg}`);
    } finally {
      setIsReturning(false);
    }
  }

  async function handleDelete(orderId: string) {
    try {
      await deleteReadyOrderMutation.mutateAsync(orderId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      toast.success('Order moved back to Pending');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed: ${msg}`);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search orders…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || isOperating}
              >
                {isReturning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Return to Pending
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Return to Pending?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move {selectedIds.size} selected order(s) back to Pending status.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReturn} disabled={isReturning}>
                  {isReturning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Return
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredOrders.length > 0 &&
                    selectedIds.size === filteredOrders.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Order No</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Karigar</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead>Ready Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No ready orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow
                  key={order.orderId}
                  className={selectedIds.has(order.orderId) ? 'bg-muted/40' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(order.orderId)}
                      onCheckedChange={() => toggleSelect(order.orderId)}
                      aria-label={`Select ${order.orderNo}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getOrderTypeLabel(order.orderType)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{order.design}</TableCell>
                  <TableCell>{order.genericName ?? '—'}</TableCell>
                  <TableCell>{order.karigarName ?? '—'}</TableCell>
                  <TableCell className="text-right">{Number(order.quantity)}</TableCell>
                  <TableCell className="text-right">{order.weight.toFixed(3)}g</TableCell>
                  <TableCell>{formatDate(order.readyDate)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isOperating}
                      onClick={() => handleDelete(order.orderId)}
                      aria-label="Move to Pending"
                    >
                      {deleteReadyOrderMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {readyOrders.length} ready order(s) total
      </p>
    </div>
  );
}

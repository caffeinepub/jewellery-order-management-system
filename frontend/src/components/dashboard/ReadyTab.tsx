import { useState, useMemo } from "react";
import { Order } from "../../backend";
import { useGetReadyOrders, useBatchDeleteOrders, useBatchReturnReadyOrders } from "../../hooks/useQueries";
import { useGetAllOrders } from "../../hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useActor } from "@/hooks/useActor";
import { useQueryClient } from "@tanstack/react-query";
import { OrderType, OrderStatus } from "@/backend";

/**
 * Groups selected orders by orderNo and sums their quantities.
 * Returns an array of [orderNo, totalQuantity] tuples for the backend.
 */
function buildReturnRequests(orders: Order[]): Array<[string, bigint]> {
  const grouped = new Map<string, bigint>();
  for (const order of orders) {
    const existing = grouped.get(order.orderNo) ?? BigInt(0);
    grouped.set(order.orderNo, existing + order.quantity);
  }
  return Array.from(grouped.entries());
}

export default function ReadyTab() {
  const { data: readyOrders = [], isLoading } = useGetReadyOrders();
  // We also need all orders to find the pending counterpart of split RB orders
  const { data: allOrders = [] } = useGetAllOrders();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  const batchDeleteMutation = useBatchDeleteOrders();
  const batchReturnMutation = useBatchReturnReadyOrders();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return readyOrders;
    const q = searchQuery.toLowerCase();
    return readyOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName ?? "").toLowerCase().includes(q) ||
        (o.karigarName ?? "").toLowerCase().includes(q)
    );
  }, [readyOrders, searchQuery]);

  const allSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedIds.has(o.orderId));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.orderId)));
    }
  };

  const toggleOne = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => readyOrders.filter((o) => selectedIds.has(o.orderId)),
    [readyOrders, selectedIds]
  );

  const handleDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("No orders selected for deletion");
      return;
    }
    batchDeleteMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedIds(new Set());
      },
      onError: (error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Delete failed:", message);
        toast.error(`Orders failed to delete: ${message}`);
      },
    });
  };

  /**
   * Handle return to pending with RB partial-supply merge logic.
   *
   * For RB orders that were partially supplied (they have originalOrderId set),
   * we need to:
   * 1. Find the original pending row (orderId == originalOrderId) which holds the remaining qty
   * 2. Delete that pending row
   * 3. Pass totalQty = pendingRemainingQty + readyQty to returnOrdersToPending
   *    so the backend creates ONE merged pending row with the full original quantity
   *
   * For all other orders, use the standard return flow.
   */
  const handleReturn = async () => {
    if (selectedOrders.length === 0) {
      toast.error("No orders selected");
      return;
    }

    if (!actor) {
      toast.error("Actor not initialized");
      return;
    }

    setIsReturning(true);
    try {
      // Separate split RB orders (have originalOrderId) from regular orders
      const splitRBOrders = selectedOrders.filter(
        (o) => o.orderType === OrderType.RB && o.originalOrderId
      );
      const regularOrders = selectedOrders.filter(
        (o) => !(o.orderType === OrderType.RB && o.originalOrderId)
      );

      // Build a map of originalOrderId -> pending order for split RB orders
      const pendingOrdersToDelete: string[] = [];
      // Map: orderNo -> extra qty to add from the pending remainder
      const extraQtyByOrderNo = new Map<string, bigint>();

      for (const readyOrder of splitRBOrders) {
        const originalId = readyOrder.originalOrderId!;
        // Find the pending counterpart in allOrders
        const pendingCounterpart = allOrders.find(
          (o) =>
            o.orderId === originalId &&
            o.status === OrderStatus.Pending
        );

        if (pendingCounterpart) {
          pendingOrdersToDelete.push(pendingCounterpart.orderId);
          const existing = extraQtyByOrderNo.get(readyOrder.orderNo) ?? BigInt(0);
          extraQtyByOrderNo.set(
            readyOrder.orderNo,
            existing + pendingCounterpart.quantity
          );
        }
      }

      // Delete the pending remainder rows for split RB orders
      if (pendingOrdersToDelete.length > 0) {
        await actor.batchDeleteOrders(pendingOrdersToDelete);
      }

      // Build return requests: group all selected orders by orderNo, sum quantities
      // For split RB orders, also add the pending remainder quantity
      const grouped = new Map<string, bigint>();
      for (const order of selectedOrders) {
        const existing = grouped.get(order.orderNo) ?? BigInt(0);
        grouped.set(order.orderNo, existing + order.quantity);
      }
      // Add extra qty from deleted pending remainders
      for (const [orderNo, extraQty] of extraQtyByOrderNo.entries()) {
        const existing = grouped.get(orderNo) ?? BigInt(0);
        grouped.set(orderNo, existing + extraQty);
      }

      const requests = Array.from(grouped.entries());

      await actor.batchReturnOrdersToPending(requests);

      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      await queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });

      setSelectedIds(new Set());
      toast.success(
        selectedOrders.length === 1
          ? "Order returned to pending"
          : `${selectedOrders.length} orders returned to pending`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Return failed:", message);
      toast.error(`Failed to return orders: ${message}`);
    } finally {
      setIsReturning(false);
    }
  };

  const isOperating =
    batchDeleteMutation.isPending || batchReturnMutation.isPending || isReturning;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
        <span className="ml-2 text-muted-foreground">Loading ready orders…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>

            {/* Return to Pending */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isOperating}
                  className="gap-1.5"
                >
                  {isReturning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Return {selectedIds.size > 1 ? `${selectedIds.size} Orders` : "Order"} to Pending
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Return Orders to Pending?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move {selectedIds.size} selected{" "}
                    {selectedIds.size === 1 ? "order" : "orders"} back to
                    Pending status in Total Orders. For partially-supplied RB
                    orders, the full original pending quantity will be restored.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReturn}>
                    Confirm Return
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isOperating}
                  className="gap-1.5"
                >
                  {batchDeleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete {selectedIds.size > 1 ? `${selectedIds.size} Orders` : "Order"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Orders?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedIds.size} selected{" "}
                    {selectedIds.size === 1 ? "order" : "orders"}. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? "No orders match your search." : "No ready orders found."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    disabled={isOperating}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Order No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Design</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Karigar</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead>Ready Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.orderId}
                  className={selectedIds.has(order.orderId) ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(order.orderId)}
                      onCheckedChange={() => toggleOne(order.orderId)}
                      disabled={isOperating}
                      aria-label={`Select order ${order.orderNo}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.orderType}</Badge>
                  </TableCell>
                  <TableCell>{order.design}</TableCell>
                  <TableCell>{order.genericName ?? "—"}</TableCell>
                  <TableCell>{order.karigarName ?? "—"}</TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell className="text-right">
                    {order.quantity.toString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.weight.toFixed(2)}g
                  </TableCell>
                  <TableCell>
                    {order.readyDate
                      ? new Date(
                          Number(order.readyDate) / 1_000_000
                        ).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} shown
        {readyOrders.length !== filteredOrders.length
          ? ` (${readyOrders.length} total)`
          : ""}
      </p>
    </div>
  );
}

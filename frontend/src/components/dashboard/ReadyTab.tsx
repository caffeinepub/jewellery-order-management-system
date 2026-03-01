import { useState, useMemo } from "react";
import { Order, OrderStatus, OrderType } from "@/backend";
import {
  useBatchReturnReadyOrders,
  useGetAllOrders,
} from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RotateCcw, Loader2 } from "lucide-react";

interface ReadyTabProps {
  orders: Order[];
  isLoading: boolean;
}

export default function ReadyTab({ orders, isLoading }: ReadyTabProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedOrderNos, setSelectedOrderNos] = useState<Set<string>>(
    new Set()
  );

  const returnMutation = useBatchReturnReadyOrders();
  const { refetch: refetchAllOrders } = useGetAllOrders();

  // Only show ready orders
  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === OrderStatus.Ready),
    [orders]
  );

  // Apply search
  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return readyOrders;
    const q = searchText.toLowerCase();
    return readyOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName ?? "").toLowerCase().includes(q) ||
        (o.karigarName ?? "").toLowerCase().includes(q)
    );
  }, [readyOrders, searchText]);

  // Group by orderNo for display and for computing total qty per orderNo
  const groupedByOrderNo = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filteredOrders) {
      if (!map.has(o.orderNo)) map.set(o.orderNo, []);
      map.get(o.orderNo)!.push(o);
    }
    return map;
  }, [filteredOrders]);

  // Unique order numbers visible
  const allVisibleOrderNos = Array.from(groupedByOrderNo.keys());
  const allSelected =
    allVisibleOrderNos.length > 0 &&
    allVisibleOrderNos.every((no) => selectedOrderNos.has(no));
  const someSelected = selectedOrderNos.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedOrderNos(new Set());
    } else {
      setSelectedOrderNos(new Set(allVisibleOrderNos));
    }
  }

  function toggleOrderNo(orderNo: string) {
    setSelectedOrderNos((prev) => {
      const next = new Set(prev);
      if (next.has(orderNo)) next.delete(orderNo);
      else next.add(orderNo);
      return next;
    });
  }

  async function handleReturn() {
    // Refetch to get the latest ready orders before computing totals
    const result = await refetchAllOrders();
    const latestOrders: Order[] = result.data ?? orders;

    // For each selected orderNo, compute the total ready qty across ALL ready
    // fragments (not just the visible filtered ones) — this is what the backend
    // validation requires.
    const requests: Array<[string, bigint]> = [];

    for (const orderNo of selectedOrderNos) {
      const allReadyForNo = latestOrders.filter(
        (o) => o.status === OrderStatus.Ready && o.orderNo === orderNo
      );
      const totalQty = allReadyForNo.reduce(
        (sum, o) => sum + Number(o.quantity),
        0
      );
      if (totalQty > 0) {
        requests.push([orderNo, BigInt(totalQty)]);
      }
    }

    if (requests.length === 0) return;

    returnMutation.mutate(requests, {
      onSuccess: () => {
        setSelectedOrderNos(new Set());
      },
    });
  }

  function getOrderTypeBadge(type: OrderType) {
    const variants: Record<OrderType, string> = {
      [OrderType.CO]:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      [OrderType.RB]:
        "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      [OrderType.SO]:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[type]}`}
      >
        {type}
      </span>
    );
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ready orders..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8"
          />
        </div>
        {someSelected && (
          <Button
            onClick={handleReturn}
            disabled={returnMutation.isPending}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {returnMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Return to Pending ({selectedOrderNos.size})
          </Button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No ready orders found.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Order No</TableHead>
                <TableHead>Design</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Karigar</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Weight (gm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.orderId}
                  className={
                    selectedOrderNos.has(order.orderNo) ? "bg-primary/5" : ""
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedOrderNos.has(order.orderNo)}
                      onCheckedChange={() => toggleOrderNo(order.orderNo)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>{order.design}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.genericName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.karigarName ?? "—"}
                  </TableCell>
                  <TableCell>{getOrderTypeBadge(order.orderType)}</TableCell>
                  <TableCell className="text-right">
                    {Number(order.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.weight.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Order, OrderStatus, OrderType } from "@/backend";
import { useMarkOrdersAsReady, useBatchSupplyRBOrders } from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, Loader2 } from "lucide-react";
import SuppliedQtyDialog from "./SuppliedQtyDialog";
import DesignImageModal from "./DesignImageModal";

interface TotalOrdersTabProps {
  orders: Order[];
  isLoading: boolean;
}

/**
 * Consolidate RB pending orders by orderNo.
 * Multiple pending fragments for the same logical RB order are merged into
 * one virtual row: quantities and weights are summed, the first fragment's
 * orderId is used as the representative, and all constituent orderIds are
 * stored in a `_fragmentIds` synthetic field for downstream use.
 */
interface ConsolidatedOrder extends Order {
  _fragmentIds?: string[];
}

function consolidateRBOrders(orders: Order[]): ConsolidatedOrder[] {
  const rbMap = new Map<string, ConsolidatedOrder>();
  const result: ConsolidatedOrder[] = [];

  for (const order of orders) {
    if (
      order.orderType === OrderType.RB &&
      order.status === OrderStatus.Pending
    ) {
      const key = order.orderNo;
      if (!rbMap.has(key)) {
        const consolidated: ConsolidatedOrder = {
          ...order,
          _fragmentIds: [order.orderId],
        };
        rbMap.set(key, consolidated);
        result.push(consolidated);
      } else {
        const existing = rbMap.get(key)!;
        existing.quantity = existing.quantity + order.quantity;
        existing.weight = existing.weight + order.weight;
        existing._fragmentIds = [
          ...(existing._fragmentIds ?? [existing.orderId]),
          order.orderId,
        ];
      }
    } else {
      result.push({ ...order });
    }
  }

  return result;
}

export default function TotalOrdersTab({
  orders,
  isLoading,
}: TotalOrdersTabProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  );
  const [rbDialogOpen, setRbDialogOpen] = useState(false);
  const [rbOrdersForDialog, setRbOrdersForDialog] = useState<
    ConsolidatedOrder[]
  >([]);
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);

  const markReadyMutation = useMarkOrdersAsReady();
  const supplyRBMutation = useBatchSupplyRBOrders();

  // Only show pending orders
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === OrderStatus.Pending),
    [orders]
  );

  // Consolidate RB fragments into single logical rows
  const consolidatedOrders = useMemo(
    () => consolidateRBOrders(pendingOrders),
    [pendingOrders]
  );

  // Apply search filter
  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return consolidatedOrders;
    const q = searchText.toLowerCase();
    return consolidatedOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName ?? "").toLowerCase().includes(q) ||
        (o.karigarName ?? "").toLowerCase().includes(q)
    );
  }, [consolidatedOrders, searchText]);

  // Group by design code
  const groupedByDesign = useMemo(() => {
    const map = new Map<string, ConsolidatedOrder[]>();
    for (const o of filteredOrders) {
      const key = o.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filteredOrders]);

  const allVisibleIds = filteredOrders.map((o) => o.orderId);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedOrderIds.has(id));
  const someSelected = selectedOrderIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allVisibleIds));
    }
  }

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function handleMarkReady() {
    const selectedOrders = filteredOrders.filter((o) =>
      selectedOrderIds.has(o.orderId)
    );

    const rbOrders = selectedOrders.filter(
      (o) => o.orderType === OrderType.RB
    );
    const nonRbOrders = selectedOrders.filter(
      (o) => o.orderType !== OrderType.RB
    );

    // Mark non-RB orders ready immediately
    if (nonRbOrders.length > 0) {
      markReadyMutation.mutate(nonRbOrders.map((o) => o.orderId));
    }

    // Open supply dialog for RB orders (already consolidated — one per logical order)
    if (rbOrders.length > 0) {
      setRbOrdersForDialog(rbOrders as ConsolidatedOrder[]);
      setRbDialogOpen(true);
    }

    setSelectedOrderIds(new Set());
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
            placeholder="Search orders..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8"
          />
        </div>
        {someSelected && (
          <Button
            onClick={handleMarkReady}
            disabled={
              markReadyMutation.isPending || supplyRBMutation.isPending
            }
            size="sm"
            className="gap-1.5"
          >
            {markReadyMutation.isPending || supplyRBMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Mark as Ready ({selectedOrderIds.size})
          </Button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No pending orders found.
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
              {Array.from(groupedByDesign.entries()).map(
                ([design, designOrders]) => (
                  <>
                    <TableRow key={`group-${design}`} className="bg-muted/30">
                      <TableCell colSpan={8} className="py-1.5">
                        <button
                          className="text-xs font-semibold text-foreground hover:underline"
                          onClick={() => setImageModalDesign(design)}
                        >
                          {design}
                          {designOrders[0]?.genericName
                            ? ` — ${designOrders[0].genericName}`
                            : ""}
                        </button>
                      </TableCell>
                    </TableRow>
                    {designOrders.map((order) => (
                      <TableRow
                        key={order.orderId}
                        className={
                          selectedOrderIds.has(order.orderId)
                            ? "bg-primary/5"
                            : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedOrderIds.has(order.orderId)}
                            onCheckedChange={() => toggleOrder(order.orderId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.orderNo}
                        </TableCell>
                        <TableCell>{order.design}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.genericName ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.karigarName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {getOrderTypeBadge(order.orderType)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(order.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.weight.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* RB Supplied Qty Dialog — receives consolidated orders (one per logical RB) */}
      <SuppliedQtyDialog
        open={rbDialogOpen}
        onOpenChange={setRbDialogOpen}
        orders={rbOrdersForDialog}
      />

      {/* Design image modal */}
      {imageModalDesign && (
        <DesignImageModal
          designCode={imageModalDesign}
          open={!!imageModalDesign}
          onClose={() => setImageModalDesign(null)}
        />
      )}
    </div>
  );
}

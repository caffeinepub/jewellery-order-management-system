import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Trash2, Loader2, CheckSquare, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Order } from "@/backend";
import {
  useGetAllMasterDesignMappings,
  useDeleteOrder,
  useMarkOrdersAsReady,
} from "@/hooks/useQueries";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";
import DesignImageModal from "@/components/dashboard/DesignImageModal";

interface TotalOrdersTabProps {
  orders: Order[];
  isError?: boolean;
}

function formatDate(time?: bigint): string {
  if (!time) return "-";
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TotalOrdersTab({ orders, isError }: TotalOrdersTabProps) {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);

  const { data: masterDesigns = [] } = useGetAllMasterDesignMappings();
  const deleteOrderMutation = useDeleteOrder();
  const markReadyMutation = useMarkOrdersAsReady();

  // Build design mapping lookup from master designs (source of truth)
  const designMappingMap = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    for (const [code, mapping] of masterDesigns) {
      map.set(code, { genericName: mapping.genericName, karigarName: mapping.karigarName });
    }
    return map;
  }, [masterDesigns]);

  // Enrich orders with latest karigar/generic from master designs
  const enrichedOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "Pending")
      .map((order) => {
        const mapping = designMappingMap.get(order.design);
        if (mapping) {
          return { ...order, karigarName: mapping.karigarName, genericName: mapping.genericName };
        }
        return order;
      });
  }, [orders, designMappingMap]);

  // Filter
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return enrichedOrders;
    const q = search.toLowerCase();
    return enrichedOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName || "").toLowerCase().includes(q) ||
        (o.karigarName || "").toLowerCase().includes(q)
    );
  }, [enrichedOrders, search]);

  // Group by design code
  const groupedByDesign = useMemo(() => {
    const groups = new Map<string, { designCode: string; genericName: string; karigarName: string; orders: Order[] }>();
    for (const order of filteredOrders) {
      const dc = order.design;
      if (!groups.has(dc)) {
        groups.set(dc, {
          designCode: dc,
          genericName: order.genericName || "",
          karigarName: order.karigarName || "",
          orders: [],
        });
      }
      groups.get(dc)!.orders.push(order);
    }
    return Array.from(groups.values()).sort((a, b) => a.designCode.localeCompare(b.designCode));
  }, [filteredOrders]);

  const toggleGroup = (dc: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(dc)) next.delete(dc);
      else next.add(dc);
      return next;
    });
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectGroup = (orders: Order[]) => {
    const ids = orders.map((o) => o.orderId);
    const allSelected = ids.every((id) => selectedOrderIds.has(id));
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleMarkReady = async () => {
    if (selectedOrderIds.size === 0) return;
    await markReadyMutation.mutateAsync(Array.from(selectedOrderIds));
    setSelectedOrderIds(new Set());
  };

  const handleDelete = async (orderId: string) => {
    await deleteOrderMutation.mutateAsync(orderId);
  };

  const handleSupply = (orders: Order[]) => {
    setSupplyOrders(orders);
    setSupplyDialogOpen(true);
  };

  const totalPending = enrichedOrders.length;
  const totalQty = enrichedOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalWeight = enrichedOrders.reduce((s, o) => s + o.weight, 0);

  if (isError) {
    return (
      <div className="text-center py-16 text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>{totalPending} pending orders</span>
        <span>·</span>
        <span>{totalQty} pcs</span>
        <span>·</span>
        <span>{totalWeight.toFixed(3)}g</span>
      </div>

      {/* Search + actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search order, design, karigar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        {selectedOrderIds.size > 0 && (
          <Button
            size="sm"
            onClick={handleMarkReady}
            disabled={markReadyMutation.isPending}
          >
            {markReadyMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <CheckSquare className="w-4 h-4 mr-1" />
            )}
            Mark Ready ({selectedOrderIds.size})
          </Button>
        )}
      </div>

      {/* Groups */}
      {groupedByDesign.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No orders match your search." : "No pending orders."}
        </div>
      ) : (
        <div className="space-y-2">
          {groupedByDesign.map((group) => {
            const isExpanded = expandedGroups.has(group.designCode);
            const groupQty = group.orders.reduce((s, o) => s + Number(o.quantity), 0);
            const groupWeight = group.orders.reduce((s, o) => s + o.weight, 0);
            const allGroupSelected = group.orders.every((o) => selectedOrderIds.has(o.orderId));
            const someGroupSelected = group.orders.some((o) => selectedOrderIds.has(o.orderId));

            return (
              <div key={group.designCode} className="border border-border rounded-lg overflow-hidden bg-card">
                {/* Group header */}
                <div
                  className="flex items-center gap-2 p-2 md:p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(group.designCode)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allGroupSelected}
                      data-state={someGroupSelected && !allGroupSelected ? "indeterminate" : undefined}
                      onCheckedChange={() => toggleSelectGroup(group.orders)}
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-primary text-sm">{group.designCode}</span>
                      {group.genericName && (
                        <span className="text-xs text-muted-foreground truncate">{group.genericName}</span>
                      )}
                      {group.karigarName && (
                        <Badge variant="outline" className="text-xs px-1 py-0 shrink-0">
                          {group.karigarName}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {group.orders.length} orders · {groupQty} pcs · {groupWeight.toFixed(3)}g
                    </div>
                  </div>
                  <button
                    className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalDesign(group.designCode);
                    }}
                    title="View design image"
                  >
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSupply(group.orders);
                    }}
                  >
                    Supply
                  </Button>
                </div>

                {/* Orders */}
                {isExpanded && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 w-8"></th>
                          <th className="p-2 text-left">Order No</th>
                          <th className="p-2 text-center">Type</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Weight</th>
                          <th className="p-2 text-left">Order Date</th>
                          <th className="p-2 text-left">Remarks</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders
                          .slice()
                          .sort((a, b) => {
                            const da = a.orderDate ? Number(a.orderDate) : 0;
                            const db = b.orderDate ? Number(b.orderDate) : 0;
                            return da - db;
                          })
                          .map((order, i) => (
                            <tr
                              key={order.orderId}
                              className={`border-t border-border/50 ${selectedOrderIds.has(order.orderId) ? "bg-primary/10" : i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                            >
                              <td className="p-2">
                                <Checkbox
                                  checked={selectedOrderIds.has(order.orderId)}
                                  onCheckedChange={() => toggleSelectOrder(order.orderId)}
                                />
                              </td>
                              <td className="p-2 font-medium">{order.orderNo}</td>
                              <td className="p-2 text-center">
                                <Badge variant="outline" className="text-xs px-1 py-0">{order.orderType}</Badge>
                              </td>
                              <td className="p-2 text-center">{Number(order.quantity)}</td>
                              <td className="p-2 text-right">{order.weight.toFixed(3)}g</td>
                              <td className="p-2">{formatDate(order.orderDate)}</td>
                              <td className="p-2 text-muted-foreground">{order.remarks || "-"}</td>
                              <td className="p-2">
                                <button
                                  onClick={() => handleDelete(order.orderId)}
                                  disabled={deleteOrderMutation.isPending}
                                  className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Supply dialog */}
      <SuppliedQtyDialog
        open={supplyDialogOpen}
        onOpenChange={setSupplyDialogOpen}
        orders={supplyOrders}
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

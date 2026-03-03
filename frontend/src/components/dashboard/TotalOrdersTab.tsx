import { useState, useMemo } from "react";
import { Order, OrderStatus, OrderType } from "../../backend";
import {
  useMarkOrdersAsReady,
  useDeleteOrder,
  useKarigarResolver,
} from "../../hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import SuppliedQtyDialog from "./SuppliedQtyDialog";
import DesignImageModal from "./DesignImageModal";
import { AgeingBadge } from "../../utils/ageingBadge";
import { Image as ImageIcon } from "lucide-react";

interface TotalOrdersTabProps {
  orders: Order[];
  isError?: boolean;
}

// Dynamic weight: always unit_weight × qty
function dynamicWeight(order: Order): number {
  return order.weight * Number(order.quantity);
}

// Count unique order numbers
function uniqueOrderCount(orders: Order[]): number {
  return new Set(orders.map((o) => o.orderNo)).size;
}

export function TotalOrdersTab({ orders, isError }: TotalOrdersTabProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RB" | "CO" | "SO">("ALL");
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);

  const markAsReady = useMarkOrdersAsReady();
  const deleteOrder = useDeleteOrder();

  // Single source of truth: resolve karigar dynamically from master design mappings
  const resolveKarigar = useKarigarResolver();

  // Filter: only Pending orders with qty > 0
  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === OrderStatus.Pending &&
          Number(o.quantity) > 0
      ),
    [orders]
  );

  // Apply search + type filter — karigar resolved dynamically
  const filteredOrders = useMemo(() => {
    let result = pendingOrders;
    if (typeFilter !== "ALL") {
      result = result.filter((o) => o.orderType === typeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((o) => {
        const resolvedKarigar = resolveKarigar(o.design);
        return (
          o.orderNo.toLowerCase().includes(q) ||
          o.design.toLowerCase().includes(q) ||
          (o.genericName ?? "").toLowerCase().includes(q) ||
          resolvedKarigar.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [pendingOrders, typeFilter, searchText, resolveKarigar]);

  // Group by design code, sorted oldest-due-first within each group
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filteredOrders) {
      const key = o.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    // Sort within each group: oldest orderDate first, then by weight desc
    for (const [, groupOrders] of map) {
      groupOrders.sort((a, b) => {
        const aDate = a.orderDate ? Number(a.orderDate) : Infinity;
        const bDate = b.orderDate ? Number(b.orderDate) : Infinity;
        if (aDate !== bDate) return aDate - bDate;
        return dynamicWeight(b) - dynamicWeight(a);
      });
    }
    return map;
  }, [filteredOrders]);

  const toggleGroup = (design: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(design)) next.delete(design);
      else next.add(design);
      return next;
    });
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectGroup = (design: string) => {
    const groupOrders = groups.get(design) ?? [];
    const allSelected = groupOrders.every((o) => selectedIds.has(o.orderId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupOrders.forEach((o) => next.delete(o.orderId));
      } else {
        groupOrders.forEach((o) => next.add(o.orderId));
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.orderId)));
    }
  };

  const handleMarkAsReady = async () => {
    if (selectedIds.size === 0) return;
    await markAsReady.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleOpenSupplyDialog = () => {
    const rbSelected = filteredOrders.filter(
      (o) => selectedIds.has(o.orderId) && o.orderType === OrderType.RB
    );
    if (rbSelected.length === 0) return;
    setSupplyOrders(rbSelected);
    setSupplyDialogOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    await deleteOrder.mutateAsync(orderId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  };

  // Summary stats — dynamic weight
  const totalQty = filteredOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalWeight = filteredOrders.reduce((s, o) => s + dynamicWeight(o), 0);
  const orderCount = uniqueOrderCount(filteredOrders);

  const selectedOrders = filteredOrders.filter((o) => selectedIds.has(o.orderId));
  const selectedRBCount = selectedOrders.filter(
    (o) => o.orderType === OrderType.RB
  ).length;

  if (isError) {
    return (
      <div className="p-4 text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters + actions */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
        <Input
          placeholder="Search order, design, karigar…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-8 text-sm max-w-xs"
        />

        {/* Type filter buttons */}
        <div className="flex gap-1">
          {(["ALL", "RB", "CO", "SO"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => setTypeFilter(t)}
              className="h-7 px-2 text-xs"
            >
              {t}
            </Button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAsReady}
              disabled={markAsReady.isPending}
              className="h-8 text-xs"
            >
              {markAsReady.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              Mark as Ready ({selectedIds.size})
            </Button>

            {selectedRBCount > 0 && (
              <Button
                size="sm"
                onClick={handleOpenSupplyDialog}
                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
              >
                Supply RB ({selectedRBCount})
              </Button>
            )}
          </>
        )}
      </div>

      {/* Summary row */}
      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <span>
          <span className="font-semibold text-foreground">{orderCount}</span>{" "}
          orders
        </span>
        <span>
          <span className="font-semibold text-foreground">{totalQty}</span> qty
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {totalWeight.toFixed(2)}g
          </span>{" "}
          weight
        </span>
        {selectedIds.size > 0 && (
          <span className="text-primary">{selectedIds.size} selected</span>
        )}
      </div>

      {/* Select all */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={
              selectedIds.size === filteredOrders.length &&
              filteredOrders.length > 0
            }
            onCheckedChange={toggleSelectAll}
            id="select-all-total"
          />
          <label
            htmlFor="select-all-total"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Select all
          </label>
        </div>
      )}

      {/* Groups */}
      {filteredOrders.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          No pending orders found.
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(groups.entries()).map(([design, groupOrders]) => {
            const isExpanded = expandedGroups.has(design);
            const groupQty = groupOrders.reduce(
              (s, o) => s + Number(o.quantity),
              0
            );
            const groupWeight = groupOrders.reduce(
              (s, o) => s + dynamicWeight(o),
              0
            );
            const allSelected = groupOrders.every((o) =>
              selectedIds.has(o.orderId)
            );
            const someSelected = groupOrders.some((o) =>
              selectedIds.has(o.orderId)
            );
            // Resolve karigar dynamically from master design — single source of truth
            const resolvedKarigar = resolveKarigar(design);
            // Generic name still comes from order record (not karigar-related)
            const genericName = groupOrders[0]?.genericName ?? "";

            return (
              <div
                key={design}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Group header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(design)}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectGroup(design);
                    }}
                  >
                    <Checkbox
                      checked={allSelected}
                      data-state={
                        someSelected && !allSelected
                          ? "indeterminate"
                          : undefined
                      }
                      onCheckedChange={() => toggleSelectGroup(design)}
                    />
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalDesign(design);
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>

                  <span className="font-bold text-sm text-amber-500">
                    {design}
                  </span>
                  {genericName && (
                    <span className="text-xs text-muted-foreground">
                      {genericName}
                    </span>
                  )}
                  {/* Show dynamically resolved karigar — never from stored order field */}
                  {resolvedKarigar !== "Unassigned" && (
                    <Badge variant="outline" className="text-xs h-5">
                      {resolvedKarigar}
                    </Badge>
                  )}
                  {resolvedKarigar === "Unassigned" && (
                    <Badge variant="outline" className="text-xs h-5 text-muted-foreground border-muted-foreground/30">
                      Unassigned
                    </Badge>
                  )}

                  <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Qty: {groupQty}</span>
                    <span>{groupWeight.toFixed(2)}g</span>
                  </div>
                </div>

                {/* Group rows */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {groupOrders.map((order) => {
                      const qty = Number(order.quantity);
                      const weight = dynamicWeight(order);

                      return (
                        <div
                          key={order.orderId}
                          className="flex items-center gap-2 px-3 py-2 bg-background hover:bg-muted/30 transition-colors"
                        >
                          <Checkbox
                            checked={selectedIds.has(order.orderId)}
                            onCheckedChange={() => toggleSelect(order.orderId)}
                          />

                          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Order:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {order.orderNo}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Qty:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {qty}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Wt:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {weight.toFixed(2)}g
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Size:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {order.size}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Type:{" "}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs h-4 ${
                                  order.orderType === OrderType.RB
                                    ? "border-amber-500/50 text-amber-500"
                                    : order.orderType === OrderType.CO
                                    ? "border-blue-500/50 text-blue-500"
                                    : "border-purple-500/50 text-purple-500"
                                }`}
                              >
                                {order.orderType}
                              </Badge>
                            </div>
                            {order.orderDate && (
                              <div>
                                <AgeingBadge orderDate={order.orderDate} />
                              </div>
                            )}
                            {order.remarks && (
                              <div className="col-span-2 sm:col-span-4 text-muted-foreground italic">
                                {order.remarks}
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(order.orderId)}
                            disabled={deleteOrder.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Supply dialog */}
      {supplyDialogOpen && (
        <SuppliedQtyDialog
          open={supplyDialogOpen}
          onOpenChange={setSupplyDialogOpen}
          orders={supplyOrders}
        />
      )}

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

export default TotalOrdersTab;

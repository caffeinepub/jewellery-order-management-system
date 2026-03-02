import { useState, useMemo } from "react";
import { Order, OrderStatus } from "@/backend";
import { useGetAllOrders, useMarkOrdersAsPending } from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight, FileDown } from "lucide-react";
import DesignImageModal from "@/components/dashboard/DesignImageModal";
import { exportOrdersToImage, exportAllToPDF, exportSelectedToPDF } from "@/utils/exportUtils";

interface ReadyTabProps {
  orders?: Order[];
  isError?: boolean;
  searchQuery?: string;
}

export function ReadyTab({ orders: propOrders, isError, searchQuery = "" }: ReadyTabProps) {
  const { data: fetchedOrders = [], isLoading } = useGetAllOrders();
  const allOrders = propOrders ?? fetchedOrders;
  const markAsPendingMutation = useMarkOrdersAsPending();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);

  const readyOrders = useMemo(
    () => allOrders.filter((o) => o.status === OrderStatus.Ready),
    [allOrders]
  );

  const filtered = useMemo(() => {
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

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filtered) {
      const key = o.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filtered]);

  const toggleGroup = (design: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(design)) next.delete(design);
      else next.add(design);
      return next;
    });
  };

  const toggleSelectAll = (design: string, orders: Order[]) => {
    const ids = orders.map((o) => o.orderId);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkAsPending = () => {
    if (!selectedIds.size) return;
    markAsPendingMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const handleExportJpeg = async () => {
    setIsExportingJpeg(true);
    try {
      await exportOrdersToImage(filtered, "Ready Orders", "ready-orders.jpg");
    } finally {
      setIsExportingJpeg(false);
    }
  };

  const handleExportPDFAll = () => {
    exportAllToPDF(filtered, "ready-orders-all.pdf");
  };

  const handleExportPDFSelected = () => {
    const sel = filtered.filter((o) => selectedIds.has(o.orderId));
    exportSelectedToPDF(sel, "ready-orders-selected.pdf");
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  if (isLoading && !propOrders) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAsPending}
            disabled={markAsPendingMutation.isPending}
          >
            {markAsPendingMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Mark as Pending ({selectedIds.size})
          </Button>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleExportJpeg} disabled={isExportingJpeg}>
            {isExportingJpeg ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-1 h-4 w-4" />
            )}
            Export JPEG
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDFAll}>
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF (All)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDFSelected}
            disabled={selectedIds.size === 0}
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF (Selected)
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No ready orders found.</div>
      ) : (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([design, orders]) => {
            const isExpanded = expandedGroups.has(design);
            const allSelected = orders.every((o) => selectedIds.has(o.orderId));
            const someSelected = orders.some((o) => selectedIds.has(o.orderId));
            const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
            const totalQty = orders.reduce((s, o) => s + Number(o.quantity), 0);

            return (
              <div key={design} className="border border-border rounded-lg overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(design)}
                >
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                    onCheckedChange={() => toggleSelectAll(design, orders)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span
                    className="font-bold text-orange-500 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalDesign(design);
                    }}
                  >
                    {design}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {orders[0]?.genericName ?? ""}
                  </span>
                  <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{orders.length} orders</span>
                    <span>{totalWeight.toFixed(2)}g</span>
                    <span>Qty: {totalQty}</span>
                    <Badge variant="secondary" className="text-xs">
                      {orders[0]?.karigarName ?? "—"}
                    </Badge>
                  </div>
                </div>

                {/* Expanded rows */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {orders.map((order) => (
                      <div
                        key={order.orderId}
                        className="flex items-center gap-3 px-4 py-2 bg-background hover:bg-muted/30 transition-colors"
                      >
                        <Checkbox
                          checked={selectedIds.has(order.orderId)}
                          onCheckedChange={() => toggleOne(order.orderId)}
                        />
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <span className="font-medium text-foreground">{order.orderNo}</span>
                          <span className="text-muted-foreground">
                            Wt: <span className="text-foreground">{order.weight}g</span>
                          </span>
                          <span className="text-muted-foreground">
                            Qty: <span className="text-foreground">{Number(order.quantity)}</span>
                          </span>
                          <Badge variant="outline" className="text-xs w-fit">
                            {order.orderType}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

export default ReadyTab;

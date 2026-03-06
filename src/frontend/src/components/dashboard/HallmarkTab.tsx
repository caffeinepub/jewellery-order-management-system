import { type Order, OrderStatus } from "@/backend";
import DesignImageModal from "@/components/dashboard/DesignImageModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  useBatchUpdateOrderStatus,
  useGenericNameResolver,
  useGetAllOrders,
  useKarigarResolver,
} from "@/hooks/useQueries";
import { AgeingBadge } from "@/utils/ageingBadge";
import {
  exportAllToPDF,
  exportOrdersToImage,
  exportSelectedToPDF,
} from "@/utils/exportUtils";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

// Today's ISO date string helper
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface HallmarkTabProps {
  orders?: Order[];
  isError?: boolean;
}

// Last Action badge component
function LastActionBadge({ lastAction }: { lastAction?: string }) {
  if (!lastAction)
    return <span className="text-muted-foreground text-xs">—</span>;
  const parts = lastAction.split(" • ");
  const status = parts[0] ?? "";
  const color =
    status === "Ready"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : status === "Pending"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : status === "Returned"
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${color} whitespace-nowrap`}
    >
      {lastAction}
    </span>
  );
}

export function HallmarkTab({ orders: propOrders, isError }: HallmarkTabProps) {
  const { data: fetchedOrders = [], isLoading } = useGetAllOrders();
  const allOrders = propOrders ?? fetchedOrders;
  const batchUpdateMutation = useBatchUpdateOrderStatus();
  const { currentUser } = useAuth();
  // Single source of truth: resolve karigar and generic name dynamically from master design mappings
  const resolveKarigar = useKarigarResolver();
  const resolveGenericName = useGenericNameResolver();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [karigarFilter, setKarigarFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);
  // Date filter — default to today so Hallmark tab shows only today's moved orders
  const [hallmarkFromDate, setHallmarkFromDate] = useState<string>(todayStr());
  const [hallmarkToDate, setHallmarkToDate] = useState<string>(todayStr());

  const hallmarkOrders = useMemo(
    () => allOrders.filter((o) => o.status === OrderStatus.Hallmark),
    [allOrders],
  );

  // Date-filtered hallmark orders (based on updatedAt timestamp)
  const dateFiltered = useMemo(() => {
    if (!hallmarkFromDate && !hallmarkToDate) return hallmarkOrders;
    return hallmarkOrders.filter((o) => {
      const ms = Number(o.updatedAt) / 1_000_000;
      const d = new Date(ms);
      const dateStr = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const afterFrom = !hallmarkFromDate || dateStr >= hallmarkFromDate;
      const beforeTo = !hallmarkToDate || dateStr <= hallmarkToDate;
      return afterFrom && beforeTo;
    });
  }, [hallmarkOrders, hallmarkFromDate, hallmarkToDate]);

  // Karigar options resolved dynamically from master design mappings
  const karigars = useMemo(() => {
    const set = new Set(
      dateFiltered.map((o) => resolveKarigar(o.design)).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [dateFiltered, resolveKarigar]);

  const orderTypes = useMemo(() => {
    const set = new Set(dateFiltered.map((o) => o.orderType));
    return Array.from(set).sort();
  }, [dateFiltered]);

  const filtered = useMemo(() => {
    return dateFiltered.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName ?? "").toLowerCase().includes(q) ||
        resolveGenericName(o.design).toLowerCase().includes(q) ||
        resolveKarigar(o.design).toLowerCase().includes(q);
      // Karigar filter uses resolved karigar name
      const matchKarigar =
        !karigarFilter || resolveKarigar(o.design) === karigarFilter;
      const matchType = !orderTypeFilter || o.orderType === orderTypeFilter;
      return matchSearch && matchKarigar && matchType;
    });
  }, [
    dateFiltered,
    searchQuery,
    karigarFilter,
    orderTypeFilter,
    resolveGenericName,
    resolveKarigar,
  ]);

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

  const toggleSelectAll = (_design: string, orders: Order[]) => {
    const ids = orders.map((o) => o.orderId);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
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

  const handleReturnToPending = () => {
    if (!selectedIds.size) return;
    batchUpdateMutation.mutate(
      {
        orderIds: Array.from(selectedIds),
        newStatus: OrderStatus.Pending,
        updatedBy: currentUser?.name ?? "system",
      },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  };

  const handleExportJpeg = async () => {
    setIsExportingJpeg(true);
    try {
      await exportOrdersToImage(filtered, "Hallmark", "hallmark-orders.jpg");
    } finally {
      setIsExportingJpeg(false);
    }
  };

  const handleExportPDFAll = () => {
    exportAllToPDF(filtered, "hallmark-orders-all.pdf", "Hallmark");
  };

  const handleExportPDFSelected = () => {
    const sel = filtered.filter((o) => selectedIds.has(o.orderId));
    exportSelectedToPDF(sel, "hallmark-orders-selected.pdf", "Hallmark");
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
      {/* Date Filter Row */}
      <div className="flex flex-wrap gap-2 items-center bg-muted/30 rounded-lg px-3 py-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Date:</span>
        <div className="flex items-center gap-1">
          <label
            htmlFor="hallmark-from-date"
            className="text-xs text-muted-foreground"
          >
            From
          </label>
          <Input
            id="hallmark-from-date"
            type="date"
            value={hallmarkFromDate}
            onChange={(e) => setHallmarkFromDate(e.target.value)}
            className="h-7 text-xs w-36"
          />
        </div>
        <div className="flex items-center gap-1">
          <label
            htmlFor="hallmark-to-date"
            className="text-xs text-muted-foreground"
          >
            To
          </label>
          <Input
            id="hallmark-to-date"
            type="date"
            value={hallmarkToDate}
            onChange={(e) => setHallmarkToDate(e.target.value)}
            className="h-7 text-xs w-36"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            setHallmarkFromDate("");
            setHallmarkToDate("");
          }}
        >
          <X className="h-3 w-3 mr-1" />
          Show All
        </Button>
        {(hallmarkFromDate || hallmarkToDate) && (
          <span className="text-xs text-muted-foreground ml-auto">
            {dateFiltered.length} orders in range
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search orders, generic name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
          value={karigarFilter}
          onChange={(e) => setKarigarFilter(e.target.value)}
        >
          <option value="">All Karigars</option>
          {karigars.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
          value={orderTypeFilter}
          onChange={(e) => setOrderTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {orderTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            onClick={handleReturnToPending}
            disabled={batchUpdateMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-0"
          >
            {batchUpdateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Return to Pending ({selectedIds.size})
          </Button>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJpeg}
            disabled={isExportingJpeg}
          >
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
        <div className="text-center py-16 text-muted-foreground">
          No hallmark orders found.
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([design, orders]) => {
            const isExpanded = expandedGroups.has(design);
            const allSelected = orders.every((o) => selectedIds.has(o.orderId));
            const someSelected = orders.some((o) => selectedIds.has(o.orderId));
            const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
            const totalQty = orders.reduce((s, o) => s + Number(o.quantity), 0);

            return (
              <div
                key={design}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Group header */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: complex row with nested interactive elements */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(design)}
                >
                  <Checkbox
                    checked={allSelected}
                    data-state={
                      someSelected && !allSelected ? "indeterminate" : undefined
                    }
                    onCheckedChange={() => toggleSelectAll(design, orders)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: design code image trigger inside row */}
                  <span
                    className="font-bold text-orange-500 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalDesign(design);
                    }}
                  >
                    {design}
                  </span>
                  {resolveGenericName(design) && (
                    <span className="text-sm text-muted-foreground">
                      {resolveGenericName(design)}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{orders.length} orders</span>
                    <span>{totalWeight.toFixed(2)}g</span>
                    <span>Qty: {totalQty}</span>
                    <Badge variant="secondary" className="text-xs">
                      {resolveKarigar(design)}
                    </Badge>
                  </div>
                </div>

                {/* Expanded rows */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {orders.map((order) => (
                      <div
                        key={order.orderId}
                        className="flex items-center gap-3 px-4 py-2 bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleOne(order.orderId)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && toggleOne(order.orderId)
                        }
                      >
                        <Checkbox
                          checked={selectedIds.has(order.orderId)}
                          onCheckedChange={() => toggleOne(order.orderId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <span className="font-medium text-foreground">
                            {order.orderNo}
                          </span>
                          <span className="text-muted-foreground">
                            Wt:{" "}
                            <span className="text-foreground">
                              {order.weight}g
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            Qty:{" "}
                            <span className="text-foreground">
                              {Number(order.quantity)}
                            </span>
                          </span>
                          <Badge variant="outline" className="text-xs w-fit">
                            {order.orderType}
                          </Badge>
                          <AgeingBadge orderDate={order.orderDate} />
                          {/* Updated By */}
                          <span className="text-muted-foreground text-xs">
                            By:{" "}
                            <span className="text-foreground">
                              {order.updatedBy ?? "—"}
                            </span>
                          </span>
                          {/* Last Action */}
                          <div className="col-span-2 md:col-span-2">
                            <LastActionBadge lastAction={order.lastAction} />
                          </div>
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

export default HallmarkTab;

import { useState, useMemo, useRef } from "react";
import { Order, OrderStatus, OrderType } from "../../backend";
import { useGetAllOrders, useMarkOrdersAsPending } from "../../hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, Image, Loader2 } from "lucide-react";
import { exportToExcel, exportToPDF, exportToJPEG } from "../../utils/exportUtils";
import { AgeingBadge } from "../../utils/ageingBadge";
import { toast } from "sonner";

interface ReadyTabProps {
  orders?: Order[];
  isError?: boolean;
}

function formatReadyDate(readyDate?: bigint): string {
  if (!readyDate) return "";
  const ms = Number(readyDate) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function getOrderTypeBadgeStyle(type: OrderType) {
  switch (type) {
    case OrderType.SO: return "bg-purple-600 text-white";
    case OrderType.CO: return "bg-blue-600 text-white";
    case OrderType.RB: return "bg-green-700 text-white";
    default: return "bg-gray-600 text-white";
  }
}

export default function ReadyTab({ orders: propOrders, isError: propIsError }: ReadyTabProps) {
  const { data: fetchedOrders, isLoading, isError: fetchError } = useGetAllOrders();
  const markAsPendingMutation = useMarkOrdersAsPending();

  const allOrders = propOrders ?? fetchedOrders ?? [];
  const isError = propIsError ?? fetchError;

  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const readyOrders = useMemo(() =>
    allOrders.filter(o => o.status === OrderStatus.Ready),
    [allOrders]
  );

  const filteredOrders = useMemo(() => {
    if (!search) return readyOrders;
    const s = search.toLowerCase();
    return readyOrders.filter(o =>
      o.orderNo.toLowerCase().includes(s) ||
      o.design.toLowerCase().includes(s) ||
      (o.genericName || "").toLowerCase().includes(s) ||
      (o.karigarName || "").toLowerCase().includes(s)
    );
  }, [readyOrders, search]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, Order[]>();
    filteredOrders.forEach(o => {
      if (!groups.has(o.design)) groups.set(o.design, []);
      groups.get(o.design)!.push(o);
    });
    return groups;
  }, [filteredOrders]);

  const toggleGroup = (design: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(design)) next.delete(design);
      else next.add(design);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.orderId)));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectGroup = (orders: Order[]) => {
    const allSelected = orders.every(o => selectedOrders.has(o.orderId));
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (allSelected) {
        orders.forEach(o => next.delete(o.orderId));
      } else {
        orders.forEach(o => next.add(o.orderId));
      }
      return next;
    });
  };

  const handleMarkAsPending = async () => {
    const ids = Array.from(selectedOrders);
    if (ids.length === 0) return;
    try {
      await markAsPendingMutation.mutateAsync(ids);
      toast.success(`${ids.length} order(s) marked as Pending`);
      setSelectedOrders(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update orders";
      toast.error(message);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(filteredOrders, "ready_orders");
    toast.success("Excel export started");
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(filteredOrders, "ready_orders");
      toast.success("PDF export started");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJPEG = async () => {
    setIsExporting(true);
    try {
      await exportToJPEG(filteredOrders, "ready_orders");
      toast.success("JPEG export started");
    } catch {
      toast.error("JPEG export failed");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search + export buttons */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order no, design, generic name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Export buttons — always visible */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredOrders.length === 0 || isExporting}
            className="gap-1"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredOrders.length === 0 || isExporting}
            className="gap-1"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJPEG}
            disabled={filteredOrders.length === 0 || isExporting}
            className="gap-1"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            JPEG
          </Button>
          {selectedOrders.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleMarkAsPending}
              disabled={markAsPendingMutation.isPending}
              className="ml-auto gap-1"
            >
              {markAsPendingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Mark {selectedOrders.size} as Pending
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
          onCheckedChange={toggleSelectAll}
        />
        <span className="text-sm text-white/60">
          {filteredOrders.length} order(s) across {groupedOrders.size} design(s)
        </span>
      </div>

      {/* Groups */}
      <div ref={tableRef} className="space-y-2">
        {Array.from(groupedOrders.entries()).map(([design, groupOrds]) => {
          const isExpanded = expandedGroups.has(design);
          const totalQty = groupOrds.reduce((s, o) => s + Number(o.quantity), 0);
          const totalWeight = groupOrds.reduce((s, o) => s + o.weight, 0);
          const allGroupSelected = groupOrds.every(o => selectedOrders.has(o.orderId));
          const karigarName = groupOrds[0]?.karigarName || "";
          const genericName = groupOrds[0]?.genericName || "";

          return (
            <div key={design} className="rounded-lg border border-white/10 bg-zinc-900 overflow-hidden">
              {/* Group header row */}
              <div
                className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleGroup(design)}
              >
                <div onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={allGroupSelected}
                    onCheckedChange={() => toggleSelectGroup(groupOrds)}
                  />
                </div>
                <button className="text-white/50" onClick={e => { e.stopPropagation(); toggleGroup(design); }}>
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                  }
                </button>
                {/* Design code */}
                <span className="font-bold text-orange-400 text-sm">{design}</span>
                {/* Generic name */}
                {genericName && (
                  <span className="text-xs text-white/60">{genericName}</span>
                )}
                {/* Karigar name pill */}
                {karigarName && (
                  <span className="text-xs border border-white/20 rounded-full px-2 py-0.5 font-semibold text-white/90 bg-white/10">
                    {karigarName}
                  </span>
                )}
                {/* Stats */}
                <div className="ml-auto flex items-center gap-3 text-xs text-white/60">
                  <span>{groupOrds.length} orders</span>
                  <span>{totalQty} qty</span>
                  <span>{totalWeight.toFixed(2)}g</span>
                </div>
              </div>

              {/* Individual order rows */}
              {isExpanded && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {groupOrds.map(order => (
                    <div key={order.orderId} className="flex items-center gap-2 px-3 py-3 bg-zinc-950/50">
                      <Checkbox
                        checked={selectedOrders.has(order.orderId)}
                        onCheckedChange={() => toggleSelectOrder(order.orderId)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white">{order.orderNo}</span>
                          {order.genericName && (
                            <span className="text-xs text-white/50">{order.genericName}</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          Qty: {Number(order.quantity)} &nbsp; Wt: {order.weight.toFixed(2)}g
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getOrderTypeBadgeStyle(order.orderType)}`}>
                          {order.orderType}
                        </span>
                        {order.readyDate && (
                          <span className="text-xs text-white/50 whitespace-nowrap">
                            {formatReadyDate(order.readyDate)}
                          </span>
                        )}
                        {order.orderDate && (
                          <AgeingBadge orderDate={order.orderDate} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {groupedOrders.size === 0 && (
          <div className="text-center py-12 text-white/50">
            No ready orders found.
          </div>
        )}
      </div>
    </div>
  );
}

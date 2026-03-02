import { useState, useMemo, useRef } from "react";
import { Order, OrderType, OrderStatus } from "../../backend";
import { useGetAllOrders, useDeleteOrder, useGetAllMasterDesignMappings } from "../../hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, Image, X } from "lucide-react";
import { exportToExcel, exportToPDF, exportToJPEG } from "../../utils/exportUtils";
import { AgeingBadge } from "../../utils/ageingBadge";
import SuppliedQtyDialog from "./SuppliedQtyDialog";

interface TotalOrdersTabProps {
  orders?: Order[];
  isError?: boolean;
}

function getOrderTypeBadgeStyle(type: OrderType) {
  switch (type) {
    case OrderType.SO: return "bg-purple-600 text-white";
    case OrderType.CO: return "bg-blue-600 text-white";
    case OrderType.RB: return "bg-green-700 text-white";
    default: return "bg-gray-600 text-white";
  }
}

function formatOrderDate(orderDate?: bigint): string {
  if (!orderDate) return "";
  const ms = Number(orderDate) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export function TotalOrdersTab({ orders: propOrders, isError: propIsError }: TotalOrdersTabProps) {
  const { data: fetchedOrders, isLoading, isError: fetchError } = useGetAllOrders();
  const { data: designMappings } = useGetAllMasterDesignMappings();
  const deleteOrderMutation = useDeleteOrder();

  const allOrders = propOrders ?? fetchedOrders ?? [];
  const isError = propIsError ?? fetchError;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [karigarFilter, setKarigarFilter] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Build karigar name map from live design mappings
  const karigarByDesign = useMemo(() => {
    const map = new Map<string, string>();
    if (designMappings) {
      for (const [code, mapping] of designMappings) {
        map.set(code, mapping.karigarName);
      }
    }
    return map;
  }, [designMappings]);

  // Build generic name map from live design mappings
  const genericNameByDesign = useMemo(() => {
    const map = new Map<string, string>();
    if (designMappings) {
      for (const [code, mapping] of designMappings) {
        map.set(code, mapping.genericName);
      }
    }
    return map;
  }, [designMappings]);

  const pendingOrders = useMemo(() =>
    allOrders.filter(o => o.status === OrderStatus.Pending),
    [allOrders]
  );

  // Unique karigars from live design mappings
  const uniqueKarigars = useMemo(() => {
    const names = new Set<string>();
    pendingOrders.forEach(o => {
      // Prefer live mapping karigar name over stored order karigar name
      const name = karigarByDesign.get(o.design) || o.karigarName;
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [pendingOrders, karigarByDesign]);

  const filteredOrders = useMemo(() => {
    return pendingOrders.filter(o => {
      // Always use live mapping karigar name first
      const karigarName = karigarByDesign.get(o.design) || o.karigarName || "";
      const matchSearch = !search ||
        o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        o.design.toLowerCase().includes(search.toLowerCase()) ||
        (o.genericName || "").toLowerCase().includes(search.toLowerCase()) ||
        (genericNameByDesign.get(o.design) || "").toLowerCase().includes(search.toLowerCase()) ||
        karigarName.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || o.orderType === typeFilter;
      const matchKarigar = karigarFilter === "all" || karigarName === karigarFilter;
      return matchSearch && matchType && matchKarigar;
    });
  }, [pendingOrders, search, typeFilter, karigarFilter, karigarByDesign, genericNameByDesign]);

  // Group by design code
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, Order[]>();
    filteredOrders.forEach(o => {
      const key = o.design;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(o);
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

  const handleDelete = async (orderId: string) => {
    if (confirm("Delete this order?")) {
      await deleteOrderMutation.mutateAsync(orderId);
    }
  };

  const handleOpenSupplyDialog = (order: Order) => {
    setSupplyOrders([order]);
    setSupplyDialogOpen(true);
  };

  const handleExportExcel = () => exportToExcel(filteredOrders, "total_orders");
  const handleExportPDF = () => exportToPDF(filteredOrders, "total_orders");
  const handleExportJPEG = () => exportToJPEG(filteredOrders, "total_orders");

  const totalOrders = filteredOrders.length;
  const totalDesigns = groupedOrders.size;

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
      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order no, generic name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={OrderType.SO}>SO</SelectItem>
              <SelectItem value={OrderType.CO}>CO</SelectItem>
              <SelectItem value={OrderType.RB}>RB</SelectItem>
            </SelectContent>
          </Select>
          <Select value={karigarFilter} onValueChange={setKarigarFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Karigars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Karigars</SelectItem>
              {uniqueKarigars.map(k => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Export buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJPEG} className="gap-1">
            <Image className="h-4 w-4" /> JPEG
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
          onCheckedChange={toggleSelectAll}
        />
        <span className="text-sm text-foreground/70">
          {totalOrders} order(s) across {totalDesigns} design(s)
        </span>
      </div>

      {/* Groups */}
      <div ref={tableRef} className="space-y-2">
        {Array.from(groupedOrders.entries()).map(([design, groupOrds]) => {
          const isExpanded = expandedGroups.has(design);
          const totalQty = groupOrds.reduce((s, o) => s + Number(o.quantity), 0);
          const totalWeight = groupOrds.reduce((s, o) => s + o.weight, 0);
          const allGroupSelected = groupOrds.every(o => selectedOrders.has(o.orderId));
          // Always prefer live mapping karigar name
          const karigarName = karigarByDesign.get(design) || groupOrds[0]?.karigarName || "";
          // Always prefer live mapping generic name
          const genericName = genericNameByDesign.get(design) || groupOrds[0]?.genericName || "";

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
                {/* Design code in orange */}
                <span className="font-bold text-orange-400 text-sm">{design}</span>
                {/* Generic name */}
                {genericName && (
                  <span className="text-xs text-white/60">{genericName}</span>
                )}
                {/* Karigar name pill — live from backend */}
                {karigarName && (
                  <span className="text-xs border border-white/20 rounded-full px-2 py-0.5 font-semibold text-white/90 bg-white/10">
                    {karigarName}
                  </span>
                )}
                {/* Stats pushed to right */}
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
                          {(genericNameByDesign.get(order.design) || order.genericName) && (
                            <span className="text-xs text-white/50">
                              {genericNameByDesign.get(order.design) || order.genericName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          Qty: {Number(order.quantity)} &nbsp; Wt: {order.weight.toFixed(2)}g
                        </div>
                      </div>
                      {/* Right side: type badge + date + ageing + supply + delete */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Order type colored badge */}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getOrderTypeBadgeStyle(order.orderType)}`}>
                          {order.orderType}
                        </span>
                        {/* Order date */}
                        {order.orderDate && (
                          <span className="text-xs text-white/50 whitespace-nowrap">
                            {formatOrderDate(order.orderDate)}
                          </span>
                        )}
                        {/* Ageing badge */}
                        {order.orderDate && (
                          <AgeingBadge orderDate={order.orderDate} />
                        )}
                        {/* RB supply button */}
                        {order.orderType === OrderType.RB && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 border-white/20 text-white hover:bg-white/10"
                            onClick={e => { e.stopPropagation(); handleOpenSupplyDialog(order); }}
                          >
                            Supply
                          </Button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(order.orderId); }}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
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
            No pending orders found.
          </div>
        )}
      </div>

      {/* RB Supply Dialog */}
      <SuppliedQtyDialog
        open={supplyDialogOpen}
        onOpenChange={setSupplyDialogOpen}
        rbOrders={supplyOrders}
      />
    </div>
  );
}

export default TotalOrdersTab;

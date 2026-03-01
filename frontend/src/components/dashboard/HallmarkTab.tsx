import { useState, useMemo } from "react";
import { useGetAllOrders, useGetMasterDesigns, useBatchUpdateOrderStatus } from "@/hooks/useQueries";
import { OrderType, OrderStatus } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search, Download, ChevronDown, ChevronRight, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportToExcel } from "@/utils/exportUtils";
import DesignImageModal from "./DesignImageModal";
import { AgeingBadge } from "@/utils/ageingBadge";
import { Order } from "@/backend";

interface DesignGroup {
  designCode: string;
  orders: Order[];
  totalQty: number;
  totalWeight: number;
  orderType: OrderType;
  karigarName: string;
}

function getOrderTypeBadgeClass(type: OrderType): string {
  switch (type) {
    case OrderType.RB:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case OrderType.SO:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case OrderType.CO:
    default:
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  }
}

export default function HallmarkTab() {
  const [searchText, setSearchText] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");
  const [karigarFilter, setKarigarFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDesignCode, setSelectedDesignCode] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: masterDesigns } = useGetMasterDesigns();
  const batchUpdateOrderStatusMutation = useBatchUpdateOrderStatus();

  const enrichedOrders = useMemo(() => {
    if (!masterDesigns) return orders;
    return orders.map((order) => {
      const normalizedDesign = order.design.toUpperCase().trim();
      const mapping = masterDesigns.get(normalizedDesign);
      return {
        ...order,
        genericName: mapping?.genericName || order.genericName,
        karigarName: mapping?.karigarName || order.karigarName,
      };
    });
  }, [orders, masterDesigns]);

  const hallmarkOrders = useMemo(
    () => enrichedOrders.filter((o) => o.status === OrderStatus.Hallmark),
    [enrichedOrders]
  );

  const uniqueKarigars = useMemo(() => {
    const set = new Set<string>();
    hallmarkOrders.forEach((o) => {
      if (o.karigarName) set.add(o.karigarName);
    });
    return Array.from(set).sort();
  }, [hallmarkOrders]);

  const filteredOrders = useMemo(() => {
    let result = hallmarkOrders;

    if (orderTypeFilter !== "ALL") {
      result = result.filter((o) => o.orderType === orderTypeFilter);
    }
    if (karigarFilter !== "ALL") {
      result = result.filter((o) => o.karigarName === karigarFilter);
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((o) => Number(o.createdAt) / 1_000_000 >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000;
      result = result.filter((o) => Number(o.createdAt) / 1_000_000 < end);
    }
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(s) ||
          o.design.toLowerCase().includes(s) ||
          (o.genericName && o.genericName.toLowerCase().includes(s))
      );
    }
    return result;
  }, [hallmarkOrders, searchText, orderTypeFilter, karigarFilter, startDate, endDate]);

  // Group by design code
  const designGroups = useMemo((): DesignGroup[] => {
    const map = new Map<string, Order[]>();
    filteredOrders.forEach((o) => {
      const key = o.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return Array.from(map.entries()).map(([designCode, groupOrders]) => ({
      designCode,
      orders: groupOrders,
      totalQty: groupOrders.reduce((s, o) => s + Number(o.quantity), 0),
      totalWeight: groupOrders.reduce((s, o) => s + o.weight * Number(o.quantity), 0),
      orderType: groupOrders[0].orderType,
      karigarName: groupOrders[0].karigarName || "-",
    }));
  }, [filteredOrders]);

  const toggleGroup = (designCode: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(designCode)) next.delete(designCode);
      else next.add(designCode);
      return next;
    });
  };

  const toggleRow = (orderId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleGroupSelection = (group: DesignGroup) => {
    const allSelected = group.orders.every((o) => selectedRows.has(o.orderId));
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        group.orders.forEach((o) => next.delete(o.orderId));
      } else {
        group.orders.forEach((o) => next.add(o.orderId));
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredOrders.map((o) => o.orderId)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleMarkAsReturned = () => {
    if (selectedRows.size === 0) {
      toast.error("Please select at least one order");
      return;
    }
    setShowReturnDialog(true);
  };

  const confirmMarkAsReturned = async () => {
    try {
      const orderIds = Array.from(selectedRows);
      await batchUpdateOrderStatusMutation.mutateAsync({
        orderIds,
        newStatus: OrderStatus.ReturnFromHallmark,
      });
      toast.success(`${orderIds.length} order(s) marked as Returned`);
      setSelectedRows(new Set());
      setShowReturnDialog(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update orders";
      toast.error(errorMessage);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      exportToExcel(filteredOrders);
      toast.success("Exported to Excel successfully");
    } catch {
      toast.error("Failed to export to Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const allSelected = filteredOrders.length > 0 && selectedRows.size === filteredOrders.length;

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order no, design code, generic name"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="h-9 w-[130px] rounded-full text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value={OrderType.RB}>RB</SelectItem>
              <SelectItem value={OrderType.CO}>CO</SelectItem>
              <SelectItem value={OrderType.SO}>SO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={karigarFilter} onValueChange={setKarigarFilter}>
            <SelectTrigger className="h-9 w-[140px] rounded-full text-xs">
              <SelectValue placeholder="All Karigars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Karigars</SelectItem>
              {uniqueKarigars.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date range filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 border rounded-md bg-background text-sm h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 border rounded-md bg-background text-sm h-8"
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            {selectedRows.size > 0 && ` · ${selectedRows.size} selected`}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || filteredOrders.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={handleMarkAsReturned}
            disabled={selectedRows.size === 0 || batchUpdateOrderStatusMutation.isPending}
            className="bg-gold hover:bg-gold-hover text-white"
          >
            Mark Returned ({selectedRows.size})
          </Button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hallmark orders found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {designGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.designCode);
            const groupAllSelected = group.orders.every((o) => selectedRows.has(o.orderId));
            const groupSomeSelected =
              group.orders.some((o) => selectedRows.has(o.orderId)) && !groupAllSelected;

            return (
              <div
                key={group.designCode}
                className="rounded-lg border border-border overflow-hidden"
              >
                {/* Group header */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors">
                  <Checkbox
                    checked={groupAllSelected}
                    data-state={groupSomeSelected ? "indeterminate" : undefined}
                    onCheckedChange={() => toggleGroupSelection(group)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => toggleGroup(group.designCode)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <button
                      className="font-semibold text-sm text-foreground hover:text-gold hover:underline transition-colors shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDesignCode(group.designCode);
                      }}
                      title="View design image"
                    >
                      {group.designCode}
                    </button>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${getOrderTypeBadgeClass(group.orderType)}`}
                    >
                      {group.orderType}
                    </span>
                    <span className="text-xs text-muted-foreground truncate hidden sm:block">
                      {group.karigarName}
                    </span>
                  </button>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-auto">
                    <span className="hidden xs:inline">{group.orders.length} orders</span>
                    <span>{group.totalQty} qty</span>
                    <span>{group.totalWeight.toFixed(2)}g</span>
                    <Image
                      className="h-3.5 w-3.5 text-muted-foreground/60 cursor-pointer hover:text-gold transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDesignCode(group.designCode);
                      }}
                    />
                  </div>
                </div>

                {/* Sub-orders */}
                {isExpanded && (
                  <div className="divide-y divide-border/50">
                    {group.orders.map((order) => (
                      <div
                        key={order.orderId}
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                          selectedRows.has(order.orderId)
                            ? "bg-gold/5"
                            : "hover:bg-muted/20"
                        }`}
                        onClick={() => toggleRow(order.orderId)}
                      >
                        <div className="w-5 shrink-0" />
                        <Checkbox
                          checked={selectedRows.has(order.orderId)}
                          onCheckedChange={() => toggleRow(order.orderId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{order.orderNo}</span>
                            {order.genericName && (
                              <span className="text-xs text-muted-foreground">{order.genericName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>Qty: {Number(order.quantity)}</span>
                            <span>Wt: {(order.weight * Number(order.quantity)).toFixed(2)}g</span>
                            {order.orderDate && (
                              <span>
                                {new Date(Number(order.orderDate) / 1_000_000).toLocaleDateString(
                                  "en-GB",
                                  { day: "2-digit", month: "short", year: "2-digit" }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <AgeingBadge orderDate={order.orderDate} />
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

      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Returned from Hallmark?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedRows.size} order(s) as Returned from Hallmark. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsReturned}
              className="bg-gold hover:bg-gold-hover text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedDesignCode && (
        <DesignImageModal
          designCode={selectedDesignCode}
          open={!!selectedDesignCode}
          onClose={() => setSelectedDesignCode(null)}
        />
      )}
    </div>
  );
}

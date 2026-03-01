import { useState, useMemo } from "react";
import { CheckCircle, Package, ChevronDown, ChevronRight, Search, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Order, OrderType, OrderStatus } from "@/backend";
import { useMarkOrdersAsReady, useBatchSupplyRBOrders } from "@/hooks/useQueries";
import { toast } from "sonner";
import SuppliedQtyDialog from "./SuppliedQtyDialog";
import DesignImageModal from "./DesignImageModal";
import { AgeingBadge } from "@/utils/ageingBadge";

interface TotalOrdersTabProps {
  orders: Order[];
  isLoading: boolean;
}

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

export default function TotalOrdersTab({ orders, isLoading }: TotalOrdersTabProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [rbOrdersForDialog, setRbOrdersForDialog] = useState<Order[]>([]);
  const [selectedDesignCode, setSelectedDesignCode] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");
  const [karigarFilter, setKarigarFilter] = useState<string>("ALL");

  const markReadyMutation = useMarkOrdersAsReady();
  const batchSupplyMutation = useBatchSupplyRBOrders();

  // Exclude ghost pending entries
  const readyOrderIds = new Set(
    orders.filter((o) => o.status === OrderStatus.Ready).map((o) => o.orderId)
  );
  const pendingOrders = orders.filter(
    (o) => o.status === OrderStatus.Pending && !readyOrderIds.has(o.orderId)
  );

  // Unique karigars for filter
  const uniqueKarigars = useMemo(() => {
    const set = new Set<string>();
    pendingOrders.forEach((o) => {
      if (o.karigarName) set.add(o.karigarName);
    });
    return Array.from(set).sort();
  }, [pendingOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    let result = pendingOrders;
    if (orderTypeFilter !== "ALL") {
      result = result.filter((o) => o.orderType === orderTypeFilter);
    }
    if (karigarFilter !== "ALL") {
      result = result.filter((o) => o.karigarName === karigarFilter);
    }
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      result = result.filter(
        (o) =>
          o.design.toLowerCase().includes(s) ||
          o.orderNo.toLowerCase().includes(s) ||
          (o.genericName && o.genericName.toLowerCase().includes(s))
      );
    }
    return result;
  }, [pendingOrders, orderTypeFilter, karigarFilter, searchText]);

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

  const toggleOrder = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleGroupSelection = (group: DesignGroup) => {
    const allSelected = group.orders.every((o) => selectedOrders.has(o.orderId));
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        group.orders.forEach((o) => next.delete(o.orderId));
      } else {
        group.orders.forEach((o) => next.add(o.orderId));
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.orderId)));
    }
  };

  const handleMarkReady = async () => {
    const selected = filteredOrders.filter((o) => selectedOrders.has(o.orderId));
    if (selected.length === 0) {
      toast.error("No orders selected");
      return;
    }
    const rbOrders = selected.filter((o) => o.orderType === OrderType.RB);
    const nonRbOrders = selected.filter((o) => o.orderType !== OrderType.RB);
    if (nonRbOrders.length > 0) {
      await markReadyMutation.mutateAsync(nonRbOrders.map((o) => o.orderId));
    }
    if (rbOrders.length > 0) {
      setRbOrdersForDialog(rbOrders);
      setSupplyDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  const allFilteredSelected =
    filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length;

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
        <div className="flex gap-2">
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

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allFilteredSelected}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            {selectedOrders.size > 0 && ` · ${selectedOrders.size} selected`}
          </span>
        </div>
        <Button
          onClick={handleMarkReady}
          disabled={
            selectedOrders.size === 0 ||
            markReadyMutation.isPending ||
            batchSupplyMutation.isPending
          }
          className="bg-gold hover:bg-gold-hover text-white"
          size="sm"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Mark Ready ({selectedOrders.size})
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pending orders</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {designGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.designCode);
            const groupAllSelected = group.orders.every((o) => selectedOrders.has(o.orderId));
            const groupSomeSelected =
              group.orders.some((o) => selectedOrders.has(o.orderId)) && !groupAllSelected;

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
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          selectedOrders.has(order.orderId)
                            ? "bg-gold/5"
                            : "hover:bg-muted/20"
                        }`}
                      >
                        <div className="w-5 shrink-0" />
                        <Checkbox
                          checked={selectedOrders.has(order.orderId)}
                          onCheckedChange={() => toggleOrder(order.orderId)}
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

      <SuppliedQtyDialog
        open={supplyDialogOpen}
        onOpenChange={(open) => {
          setSupplyDialogOpen(open);
          if (!open) setSelectedOrders(new Set());
        }}
        rbOrders={rbOrdersForDialog}
      />

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

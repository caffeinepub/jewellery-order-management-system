import React, { useState, useMemo } from "react";
import { Order, OrderStatus, OrderType } from "../../backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronDown, ChevronRight, Image as ImageIcon, X, Download } from "lucide-react";
import { AgeingBadge } from "@/utils/ageingBadge";
import DesignImageModal from "./DesignImageModal";
import {
  useDeleteOrder,
  useBatchUpdateOrderStatus,
} from "../../hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";

interface HallmarkTabProps {
  orders: Order[];
  isError?: boolean;
}

interface GroupedOrders {
  designCode: string;
  genericName: string;
  karigarName: string;
  orders: Order[];
  totalQty: number;
  totalWeight: number;
}

function groupOrders(orders: Order[]): GroupedOrders[] {
  const map = new Map<string, GroupedOrders>();
  for (const order of orders) {
    const key = order.design;
    if (!map.has(key)) {
      map.set(key, {
        designCode: order.design,
        genericName: order.genericName ?? "",
        karigarName: order.karigarName ?? "",
        orders: [],
        totalQty: 0,
        totalWeight: 0,
      });
    }
    const group = map.get(key)!;
    group.orders.push(order);
    group.totalQty += Number(order.quantity);
    group.totalWeight += order.weight;
  }
  return Array.from(map.values());
}

function formatDate(time: bigint | undefined): string {
  if (!time) return "";
  const ms = Number(time) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function orderTypeBadge(type: OrderType) {
  const colors: Record<OrderType, string> = {
    [OrderType.RB]: "bg-blue-600 text-white",
    [OrderType.SO]: "bg-purple-600 text-white",
    [OrderType.CO]: "bg-green-600 text-white",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors[type]}`}>
      {type}
    </span>
  );
}

const HallmarkTab: React.FC<HallmarkTabProps> = ({ orders, isError }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [karigarFilter, setKarigarFilter] = useState<string>("all");
  const [designModalCode, setDesignModalCode] = useState<string | null>(null);

  const deleteOrderMutation = useDeleteOrder();
  const batchUpdateStatus = useBatchUpdateOrderStatus();
  const queryClient = useQueryClient();

  // Filter only Hallmark orders
  const hallmarkOrders = useMemo(
    () => orders.filter((o) => o.status === OrderStatus.Hallmark),
    [orders]
  );

  // Unique karigars for filter
  const karigars = useMemo(() => {
    const set = new Set<string>();
    hallmarkOrders.forEach((o) => { if (o.karigarName) set.add(o.karigarName); });
    return Array.from(set).sort();
  }, [hallmarkOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    return hallmarkOrders.filter((o) => {
      const search = searchText.toLowerCase();
      const matchesSearch =
        !search ||
        o.orderNo.toLowerCase().includes(search) ||
        o.design.toLowerCase().includes(search) ||
        (o.genericName ?? "").toLowerCase().includes(search) ||
        (o.karigarName ?? "").toLowerCase().includes(search);
      const matchesType = typeFilter === "all" || o.orderType === typeFilter;
      const matchesKarigar = karigarFilter === "all" || o.karigarName === karigarFilter;
      return matchesSearch && matchesType && matchesKarigar;
    });
  }, [hallmarkOrders, searchText, typeFilter, karigarFilter]);

  const grouped = useMemo(() => groupOrders(filteredOrders), [filteredOrders]);

  const toggleGroup = (designCode: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(designCode)) next.delete(designCode);
      else next.add(designCode);
      return next;
    });
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleGroupSelection = (group: GroupedOrders, checked: boolean) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      group.orders.forEach((o) => {
        if (checked) next.add(o.orderId);
        else next.delete(o.orderId);
      });
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.orderId)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const isGroupFullySelected = (group: GroupedOrders) =>
    group.orders.every((o) => selectedOrders.has(o.orderId));
  const isGroupPartiallySelected = (group: GroupedOrders) =>
    group.orders.some((o) => selectedOrders.has(o.orderId)) && !isGroupFullySelected(group);

  const allSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrders.has(o.orderId));

  // REQ-3: Mark as Returned → moves to Total Orders with status Pending
  // batchReturnOrdersToPending is a no-op stub in backend, so use batchUpdateOrderStatus with Pending
  const handleMarkAsReturned = async () => {
    const ids = Array.from(selectedOrders);
    if (ids.length === 0) return;
    await batchUpdateStatus.mutateAsync({
      orderIds: ids,
      newStatus: OrderStatus.Pending,
    });
    setSelectedOrders(new Set());
    // Invalidate all orders queries so Total Orders tab refreshes
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["allOrders"] });
  };

  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteOrderMutation.mutateAsync(orderId);
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search and filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order no, generic name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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
              <SelectItem value={OrderType.RB}>RB</SelectItem>
              <SelectItem value={OrderType.SO}>SO</SelectItem>
              <SelectItem value={OrderType.CO}>CO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={karigarFilter} onValueChange={setKarigarFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Karigars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Karigars</SelectItem>
              {karigars.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Select all + Mark as Returned */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => toggleSelectAll(!!v)}
          />
          <span className="text-sm text-muted-foreground">
            {filteredOrders.length} orders
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAsReturned}
          disabled={selectedOrders.size === 0 || batchUpdateStatus.isPending}
          className="border-gold text-gold hover:bg-gold hover:text-white"
        >
          ↩ Mark as Returned ({selectedOrders.size})
        </Button>
      </div>

      {/* Grouped order rows */}
      <div className="flex flex-col gap-2">
        {grouped.length === 0 && (
          <div className="text-center text-muted-foreground py-8">No hallmark orders found</div>
        )}
        {grouped.map((group) => {
          const isExpanded = expandedGroups.has(group.designCode);
          const groupSelected = isGroupFullySelected(group);
          const groupPartial = isGroupPartiallySelected(group);

          return (
            <div key={group.designCode} className="border border-border rounded-lg overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 bg-card cursor-pointer select-none"
                onClick={() => toggleGroup(group.designCode)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center"
                >
                  <Checkbox
                    checked={groupPartial ? "indeterminate" : groupSelected}
                    onCheckedChange={(v) => toggleGroupSelection(group, !!v)}
                  />
                </div>
                <span className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
                {/* Design code - clickable for image */}
                <button
                  className="font-bold text-sm text-foreground hover:text-gold transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDesignModalCode(group.designCode);
                  }}
                >
                  {group.designCode}
                </button>
                {group.genericName && (
                  <span className="text-xs text-muted-foreground">{group.genericName}</span>
                )}
                {group.karigarName && (
                  <Badge variant="outline" className="text-xs ml-1">
                    {group.karigarName}
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{group.orders.length} orders</span>
                  <span>{group.totalQty} qty</span>
                  <span>{group.totalWeight.toFixed(2)}g</span>
                  <ImageIcon
                    className="h-4 w-4 text-muted-foreground hover:text-gold cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDesignModalCode(group.designCode);
                    }}
                  />
                </div>
              </div>

              {/* Child rows */}
              {isExpanded && (
                <div className="divide-y divide-border">
                  {group.orders.map((order) => {
                    const isSelected = selectedOrders.has(order.orderId);
                    return (
                      <div
                        key={order.orderId}
                        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                          isSelected ? "bg-gold/10" : "bg-background hover:bg-muted/30"
                        }`}
                        onClick={() => toggleOrderSelection(order.orderId)}
                      >
                        {/* Checkbox */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOrderSelection(order.orderId)}
                          />
                        </div>

                        {/* Left: order number + qty/wt */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {order.orderNo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Qty: {String(order.quantity)} &nbsp; Wt: {order.weight.toFixed(2)}g
                          </span>
                        </div>

                        {/* Center: generic name / type label */}
                        <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                          {order.genericName && (
                            <span className="text-xs font-medium text-foreground text-center">
                              {order.genericName}
                            </span>
                          )}
                          {orderTypeBadge(order.orderType)}
                        </div>

                        {/* Right: date + ageing badge */}
                        <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
                          {order.orderDate && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(order.orderDate)}
                            </span>
                          )}
                          <AgeingBadge orderDate={order.orderDate} />
                        </div>

                        {/* Far right: delete */}
                        <button
                          className="ml-1 text-destructive hover:text-red-400 transition-colors p-1"
                          onClick={(e) => handleDeleteOrder(order.orderId, e)}
                          disabled={deleteOrderMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Design Image Modal */}
      {designModalCode && (
        <DesignImageModal
          designCode={designModalCode}
          open={!!designModalCode}
          onClose={() => setDesignModalCode(null)}
        />
      )}
    </div>
  );
};

export default HallmarkTab;

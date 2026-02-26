import { useState, useMemo } from "react";
import { Order, OrderStatus, OrderType } from "../../backend";
import { OrderTable } from "./OrderTable";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerOrdersTabProps {
  orders: Order[];
  isLoading?: boolean;
}

export default function CustomerOrdersTab({ orders, isLoading }: CustomerOrdersTabProps) {
  const [search, setSearch] = useState("");

  const coOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderType === OrderType.CO && o.status === OrderStatus.Pending
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return coOrders;
    const s = search.toLowerCase();
    return coOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(s) ||
        o.design.toLowerCase().includes(s) ||
        (o.genericName ?? "").toLowerCase().includes(s)
    );
  }, [coOrders, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by order no, design code, or generic name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <OrderTable
        orders={filteredOrders}
        showCheckboxes
        showMarkReady
        showDelete
        showExport
      />
    </div>
  );
}

export { CustomerOrdersTab };

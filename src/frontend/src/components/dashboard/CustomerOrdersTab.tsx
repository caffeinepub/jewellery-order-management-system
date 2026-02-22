import { useState, useMemo, useEffect } from "react";
import OrderTable from "./OrderTable";
import { useGetOrders } from "@/hooks/useQueries";
import { OrderType, OrderStatus, Order } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CustomerOrdersTabProps {
  onFilteredOrdersChange: (orders: Order[], isLoading: boolean) => void;
}

export default function CustomerOrdersTab({ onFilteredOrdersChange }: CustomerOrdersTabProps) {
  const [searchText, setSearchText] = useState("");
  const { data: orders = [], isLoading } = useGetOrders();

  const filteredOrders = useMemo(() => {
    // Filter for CO type orders with Pending status only
    let result = orders.filter(
      (order) => order.orderType === OrderType.CO && order.status === OrderStatus.Pending
    );

    // Filter by order number (search)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter((order) =>
        order.orderNo.toLowerCase().includes(search)
      );
    }

    return result;
  }, [orders, searchText]);

  // Notify parent of filtered orders changes
  useEffect(() => {
    onFilteredOrdersChange(filteredOrders, isLoading);
  }, [filteredOrders, isLoading, onFilteredOrdersChange]);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Order Number..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>
      <OrderTable orders={filteredOrders} />
    </div>
  );
}

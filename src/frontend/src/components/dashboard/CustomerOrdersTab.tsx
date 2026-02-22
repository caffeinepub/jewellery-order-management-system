import { useState, useMemo } from "react";
import OrderTable from "./OrderTable";
import { useGetOrdersByType } from "@/hooks/useQueries";
import { OrderType } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function CustomerOrdersTab() {
  const [searchText, setSearchText] = useState("");
  const { data: orders = [], isLoading } = useGetOrdersByType(OrderType.CO);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter by order type CO only
      if (order.orderType !== OrderType.CO) return false;
      
      // Filter by search text
      if (!searchText.trim()) return true;
      const search = searchText.toLowerCase();
      return order.orderNo.toLowerCase().includes(search);
    });
  }, [orders, searchText]);

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

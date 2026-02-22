import { useState, useMemo } from "react";
import OrderTable from "./OrderTable";
import { useGetOrders, useGetUniqueKarigarsFromMappings } from "@/hooks/useQueries";
import { OrderStatus, OrderType } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TotalOrdersTab() {
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | "All">("All");
  const [searchText, setSearchText] = useState("");
  const [karigarFilter, setKarigarFilter] = useState<string>("All");

  const { data: orders = [], isLoading } = useGetOrders();
  const { data: uniqueKarigars = [] } = useGetUniqueKarigarsFromMappings();

  const filteredOrders = useMemo(() => {
    let result = orders.filter(
      (order) =>
        order.status === OrderStatus.Pending ||
        order.status === OrderStatus.ReturnFromHallmark
    );

    // Filter by order type
    if (orderTypeFilter !== "All") {
      result = result.filter((order) => order.orderType === orderTypeFilter);
    }

    // Filter by karigar name
    if (karigarFilter !== "All") {
      result = result.filter((order) => order.karigarName === karigarFilter);
    }

    // Filter by order number (search)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter((order) =>
        order.orderNo.toLowerCase().includes(search)
      );
    }

    return result;
  }, [orders, orderTypeFilter, karigarFilter, searchText]);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          <Button
            variant={orderTypeFilter === "All" ? "default" : "outline"}
            onClick={() => setOrderTypeFilter("All")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={orderTypeFilter === OrderType.CO ? "default" : "outline"}
            onClick={() => setOrderTypeFilter(OrderType.CO)}
            size="sm"
          >
            CO
          </Button>
          <Button
            variant={orderTypeFilter === OrderType.RB ? "default" : "outline"}
            onClick={() => setOrderTypeFilter(OrderType.RB)}
            size="sm"
          >
            RB
          </Button>
        </div>
        <Select value={karigarFilter} onValueChange={setKarigarFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Karigars</SelectItem>
            {uniqueKarigars.map((karigar) => (
              <SelectItem key={karigar} value={karigar}>
                {karigar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order Number..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <OrderTable orders={filteredOrders} enableBulkActions={true} />
    </div>
  );
}

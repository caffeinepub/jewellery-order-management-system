import { useMemo, useState } from "react";
import { useGetAllOrders } from "@/hooks/useQueries";
import OrderTable from "./OrderTable";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Order, OrderType, OrderStatus } from "@/backend";
import { Button } from "@/components/ui/button";
import SuppliedQtyDialog from "./SuppliedQtyDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TotalOrdersTab() {
  const { data: allOrders = [], isLoading } = useGetAllOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState<string>("all");
  const [selectedKarigar, setSelectedKarigar] = useState<string>("all");
  const [rbOrdersForSupply, setRbOrdersForSupply] = useState<Order[]>([]);

  // Filter orders to show only Pending and ReturnFromHallmark status
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      // Only show Pending and ReturnFromHallmark orders in Total Orders tab
      const statusMatch = 
        order.status === OrderStatus.Pending || 
        order.status === OrderStatus.ReturnFromHallmark;
      
      if (!statusMatch) return false;

      const searchMatch =
        searchQuery === "" ||
        order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.design.toLowerCase().includes(searchQuery.toLowerCase());

      const typeMatch =
        selectedOrderType === "all" || order.orderType === selectedOrderType;

      const karigarMatch =
        selectedKarigar === "all" || order.karigarName === selectedKarigar;

      return searchMatch && typeMatch && karigarMatch;
    });
  }, [allOrders, searchQuery, selectedOrderType, selectedKarigar]);

  // Get unique karigars from filtered orders
  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    allOrders.forEach((order) => {
      if (order.karigarName && 
          (order.status === OrderStatus.Pending || order.status === OrderStatus.ReturnFromHallmark)) {
        karigars.add(order.karigarName);
      }
    });
    return Array.from(karigars).sort();
  }, [allOrders]);

  const handleMarkAsReady = (selectedOrders: Order[]) => {
    setRbOrdersForSupply(selectedOrders);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or design..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedOrderType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType("all")}
            className={
              selectedOrderType === "all"
                ? "bg-gold hover:bg-gold-hover"
                : ""
            }
          >
            All
          </Button>
          <Button
            variant={selectedOrderType === OrderType.SO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.SO)}
            className={
              selectedOrderType === OrderType.SO
                ? "bg-gold hover:bg-gold-hover"
                : ""
            }
          >
            SO
          </Button>
          <Button
            variant={selectedOrderType === OrderType.CO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.CO)}
            className={
              selectedOrderType === OrderType.CO
                ? "bg-gold hover:bg-gold-hover"
                : ""
            }
          >
            CO
          </Button>
          <Button
            variant={selectedOrderType === OrderType.RB ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.RB)}
            className={
              selectedOrderType === OrderType.RB
                ? "bg-gold hover:bg-gold-hover"
                : ""
            }
          >
            RB
          </Button>
        </div>
        <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Karigar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Karigars</SelectItem>
            {uniqueKarigars.map((karigar) => (
              <SelectItem key={karigar} value={karigar}>
                {karigar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OrderTable 
        orders={filteredOrders} 
        enableBulkActions={true}
        onMarkAsReady={handleMarkAsReady}
      />

      {rbOrdersForSupply.length > 0 && (
        <SuppliedQtyDialog
          orders={rbOrdersForSupply}
          onClose={() => setRbOrdersForSupply([])}
        />
      )}
    </div>
  );
}

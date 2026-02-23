import { useState, useMemo } from "react";
import OrderTable from "./OrderTable";
import { useGetAllOrders } from "@/hooks/useQueries";
import { OrderType, OrderStatus, Order } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SuppliedQtyDialog from "./SuppliedQtyDialog";

export default function TotalOrdersTab() {
  const [searchText, setSearchText] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | "ALL">("ALL");
  const [selectedKarigar, setSelectedKarigar] = useState<string>("ALL");
  const [selectedOrdersForSupply, setSelectedOrdersForSupply] = useState<Order[]>([]);
  const { data: orders = [], isLoading } = useGetAllOrders();

  const filteredOrders = useMemo(() => {
    // Filter for Pending and ReturnFromHallmark status orders only
    let result = orders.filter(
      (order) =>
        order.status === OrderStatus.Pending ||
        order.status === OrderStatus.ReturnFromHallmark
    );

    // Filter by order type
    if (selectedOrderType !== "ALL") {
      result = result.filter((order) => order.orderType === selectedOrderType);
    }

    // Filter by karigar
    if (selectedKarigar !== "ALL") {
      result = result.filter((order) => order.karigarName === selectedKarigar);
    }

    // Filter by search text (order number, design code, or generic name)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (order) =>
          order.orderNo.toLowerCase().includes(search) ||
          order.design.toLowerCase().includes(search) ||
          (order.genericName && order.genericName.toLowerCase().includes(search))
      );
    }

    return result;
  }, [orders, searchText, selectedOrderType, selectedKarigar]);

  // Get unique karigars for filter dropdown
  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    orders.forEach((order) => {
      if (order.karigarName) {
        karigars.add(order.karigarName);
      }
    });
    return Array.from(karigars).sort();
  }, [orders]);

  const handleMarkAsReady = (selectedOrders: Order[]) => {
    // Check if any selected orders are RB type with Pending status
    const rbPendingOrders = selectedOrders.filter(
      (order) => order.orderType === OrderType.RB && order.status === OrderStatus.Pending
    );

    if (rbPendingOrders.length > 0) {
      // Show dialog for RB orders
      setSelectedOrdersForSupply(rbPendingOrders);
    }
  };

  const handleCloseDialog = () => {
    setSelectedOrdersForSupply([]);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order Number, Design Code, or Generic Name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedOrderType === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType("ALL")}
          >
            All
          </Button>
          <Button
            variant={selectedOrderType === OrderType.CO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.CO)}
          >
            CO
          </Button>
          <Button
            variant={selectedOrderType === OrderType.RB ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.RB)}
          >
            RB
          </Button>
          <Button
            variant={selectedOrderType === OrderType.SO ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOrderType(OrderType.SO)}
          >
            SO
          </Button>
        </div>
        <select
          value={selectedKarigar}
          onChange={(e) => setSelectedKarigar(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="ALL">All Karigars</option>
          {uniqueKarigars.map((karigar) => (
            <option key={karigar} value={karigar}>
              {karigar}
            </option>
          ))}
        </select>
      </div>
      <OrderTable 
        orders={filteredOrders} 
        enableBulkActions={true}
        onMarkAsReady={handleMarkAsReady}
      />

      {selectedOrdersForSupply.length > 0 && (
        <SuppliedQtyDialog
          orders={selectedOrdersForSupply}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}

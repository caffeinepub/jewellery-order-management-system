import { useState, useMemo } from "react";
import OrderTable from "./OrderTable";
import { useGetAllOrders, useGetMasterDesigns, useMarkOrdersAsReady } from "@/hooks/useQueries";
import { OrderType, OrderStatus, Order } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SuppliedQtyDialog from "./SuppliedQtyDialog";
import { toast } from "sonner";

export default function TotalOrdersTab() {
  const [searchText, setSearchText] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | "ALL">("ALL");
  const [selectedKarigar, setSelectedKarigar] = useState<string>("ALL");
  const [selectedRBOrdersForSupply, setSelectedRBOrdersForSupply] = useState<Order[]>([]);
  const { data: orders = [], isLoading } = useGetAllOrders();
  const { data: masterDesigns } = useGetMasterDesigns();
  const markOrdersAsReadyMutation = useMarkOrdersAsReady();

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

  const filteredOrders = useMemo(() => {
    // Filter for Pending and ReturnFromHallmark status orders only
    let result = enrichedOrders.filter(
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
  }, [enrichedOrders, searchText, selectedOrderType, selectedKarigar]);

  // Get unique karigars for filter dropdown
  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    enrichedOrders.forEach((order) => {
      if (order.karigarName) {
        karigars.add(order.karigarName);
      }
    });
    return Array.from(karigars).sort();
  }, [enrichedOrders]);

  const handleMarkAsReady = async (selectedOrders: Order[]) => {
    // Separate RB orders from SO/CO orders
    const rbPendingOrders = selectedOrders.filter(
      (order) => order.orderType === OrderType.RB && order.status === OrderStatus.Pending
    );
    const nonRbOrders = selectedOrders.filter(
      (order) => order.orderType !== OrderType.RB
    );

    // Process SO/CO orders immediately via markOrdersAsReady
    if (nonRbOrders.length > 0) {
      try {
        const nonRbOrderIds = nonRbOrders.map((o) => o.orderId);
        await markOrdersAsReadyMutation.mutateAsync(nonRbOrderIds);
        toast.success(`${nonRbOrders.length} order(s) marked as Ready`);
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to update orders";
        toast.error(errorMessage);
        console.error("Error updating non-RB orders:", error);
      }
    }

    // If there are RB pending orders, open the supply dialog for them
    if (rbPendingOrders.length > 0) {
      setSelectedRBOrdersForSupply(rbPendingOrders);
    }
  };

  const handleCloseDialog = () => {
    setSelectedRBOrdersForSupply([]);
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

      {selectedRBOrdersForSupply.length > 0 && (
        <SuppliedQtyDialog
          orders={selectedRBOrdersForSupply}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}

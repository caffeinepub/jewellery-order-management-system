import { useState, useMemo } from "react";
import OrderTable from "./OrderTable";
import { useGetAllOrders, useGetMasterDesigns, useMarkOrdersAsReady } from "@/hooks/useQueries";
import { OrderType, OrderStatus, Order } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SuppliedQtyDialog from "./SuppliedQtyDialog";
import { toast } from "sonner";

/** Returns overdue days for an order (positive = overdue). Orders with no valid date return -Infinity so they sort to the bottom. */
function getOverdueDays(order: Order): number {
  if (!order.orderDate) return -Infinity;
  const ms = Number(order.orderDate) / 1_000_000; // nanoseconds → milliseconds
  if (!isFinite(ms) || ms <= 0) return -Infinity;
  const orderDateMs = ms;
  const nowMs = Date.now();
  return (nowMs - orderDateMs) / (1000 * 60 * 60 * 24); // days
}

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

    // Sort within each design code group by overdue days descending (most overdue first).
    // Orders with no valid orderDate go to the bottom of their group.
    // Strategy: group → sort each group → flatten back in design-code order.
    const groupMap = new Map<string, Order[]>();
    for (const order of result) {
      const key = order.design;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(order);
    }

    // Sort each group by overdue days descending
    for (const [, group] of groupMap) {
      group.sort((a, b) => {
        const daysA = getOverdueDays(a);
        const daysB = getOverdueDays(b);
        // Both have no date — preserve original order
        if (daysA === -Infinity && daysB === -Infinity) return 0;
        // No-date orders go to the bottom
        if (daysA === -Infinity) return 1;
        if (daysB === -Infinity) return -1;
        // Most overdue (highest days) first
        return daysB - daysA;
      });
    }

    // Flatten back preserving design-code group order
    const sorted: Order[] = [];
    for (const [, group] of groupMap) {
      sorted.push(...group);
    }

    return sorted;
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

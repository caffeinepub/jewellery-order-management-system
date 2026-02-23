import { useState, useMemo } from "react";
import OrderTable from "./OrderTable";
import { useGetAllOrders, useDeleteReadyOrder, useBatchUpdateOrderStatus } from "@/hooks/useQueries";
import { OrderType, OrderStatus } from "@/backend";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReadyTab() {
  const [searchText, setSearchText] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | "ALL">("ALL");
  const [selectedKarigar, setSelectedKarigar] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useGetAllOrders();
  const deleteReadyOrderMutation = useDeleteReadyOrder();
  const batchUpdateStatusMutation = useBatchUpdateOrderStatus();

  const filteredOrders = useMemo(() => {
    // Filter for Ready status orders only
    let result = orders.filter((order) => order.status === OrderStatus.Ready);

    // Deduplicate by orderId - keep only the first occurrence
    const seenOrderIds = new Set<string>();
    result = result.filter((order) => {
      if (seenOrderIds.has(order.orderId)) {
        return false;
      }
      seenOrderIds.add(order.orderId);
      return true;
    });

    // Filter by order type
    if (selectedOrderType !== "ALL") {
      result = result.filter((order) => order.orderType === selectedOrderType);
    }

    // Filter by karigar
    if (selectedKarigar !== "ALL") {
      result = result.filter((order) => order.karigarName === selectedKarigar);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((order) => Number(order.createdAt) / 1000000 >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // Add 1 day to include end date
      result = result.filter((order) => Number(order.createdAt) / 1000000 < end);
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
  }, [orders, searchText, selectedOrderType, selectedKarigar, startDate, endDate]);

  // Get unique karigars for filter dropdown
  const uniqueKarigars = useMemo(() => {
    const karigars = new Set<string>();
    orders
      .filter((order) => order.status === OrderStatus.Ready)
      .forEach((order) => {
        if (order.karigarName) {
          karigars.add(order.karigarName);
        }
      });
    return Array.from(karigars).sort();
  }, [orders]);

  const handleDelete = async (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      await deleteReadyOrderMutation.mutateAsync(orderToDelete);
      toast.success("Order moved back to Pending status");
      setOrderToDelete(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete order";
      toast.error(errorMessage);
      console.error("Error deleting order:", error);
    }
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
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>
      <OrderTable orders={filteredOrders} onDelete={handleDelete} />

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Order Back to Pending?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the order status from Ready back to Pending. The order will appear in the Total Orders tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReadyOrderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteReadyOrderMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteReadyOrderMutation.isPending ? "Moving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

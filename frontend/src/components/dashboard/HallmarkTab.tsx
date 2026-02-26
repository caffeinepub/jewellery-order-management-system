import { useState, useMemo } from "react";
import { Order, OrderStatus } from "../../backend";
import { OrderTable } from "./OrderTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Download, CheckSquare } from "lucide-react";
import { exportOrdersToExcel } from "@/utils/exportUtils";
import { useGetMasterDesigns, useBatchUpdateOrderStatus } from "@/hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface HallmarkTabProps {
  orders: Order[];
  isLoading?: boolean;
}

export default function HallmarkTab({ orders, isLoading }: HallmarkTabProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: masterDesignsRaw } = useGetMasterDesigns();
  const batchUpdateMutation = useBatchUpdateOrderStatus();

  // Build a Map from the array of [designCode, genericName, karigarName] tuples
  const masterDesigns = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    if (masterDesignsRaw) {
      for (const [designCode, genericName, karigarName] of masterDesignsRaw) {
        map.set(designCode.trim().toUpperCase(), { genericName, karigarName });
      }
    }
    return map;
  }, [masterDesignsRaw]);

  const hallmarkOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === OrderStatus.Hallmark ||
        o.status === OrderStatus.ReturnFromHallmark
    );
  }, [orders]);

  const enrichedOrders = useMemo(() => {
    return hallmarkOrders.map((order) => {
      const normalizedDesign = order.design?.trim().toUpperCase();
      const mapping = masterDesigns.get(normalizedDesign);
      return {
        ...order,
        genericName: order.genericName ?? mapping?.genericName,
        karigarName: order.karigarName ?? mapping?.karigarName,
      };
    });
  }, [hallmarkOrders, masterDesigns]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return enrichedOrders;
    const s = search.toLowerCase();
    return enrichedOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(s) ||
        o.design.toLowerCase().includes(s) ||
        (o.genericName ?? "").toLowerCase().includes(s) ||
        (o.karigarName ?? "").toLowerCase().includes(s)
    );
  }, [enrichedOrders, search]);

  const handleMarkReturned = async () => {
    if (selectedIds.length === 0) return;
    try {
      await batchUpdateMutation.mutateAsync({
        orderIds: selectedIds,
        newStatus: OrderStatus.ReturnFromHallmark,
      });
      toast.success(`${selectedIds.length} order(s) marked as Return from Hallmark`);
      setSelectedIds([]);
      setShowConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update orders");
    }
  };

  const handleExport = () => {
    exportOrdersToExcel(filteredOrders, "hallmark_orders");
  };

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
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {selectedIds.length > 0 && (
          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="bg-gold hover:bg-gold-hover text-white"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Mark Return from Hallmark ({selectedIds.length})
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

      <OrderTable
        orders={filteredOrders}
        showCheckboxes
        externalSelectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        readOnly
      />

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Return from Hallmark</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedIds.length} order(s) as Return from Hallmark?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkReturned}
              disabled={batchUpdateMutation.isPending}
            >
              {batchUpdateMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { HallmarkTab };

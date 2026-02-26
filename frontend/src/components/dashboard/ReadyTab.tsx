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
import { Trash2, RotateCcw } from "lucide-react";
import { useBatchDeleteOrders, useBatchReturnReadyOrders } from "@/hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getQuantityAsNumber } from "@/utils/orderNormalizer";

interface ReadyTabProps {
  orders: Order[];
  isLoading?: boolean;
}

export default function ReadyTab({ orders, isLoading }: ReadyTabProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);

  const deleteMutation = useBatchDeleteOrders();
  const returnMutation = useBatchReturnReadyOrders();

  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === OrderStatus.Ready);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return readyOrders;
    const s = search.toLowerCase();
    return readyOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(s) ||
        o.design.toLowerCase().includes(s) ||
        (o.karigarName ?? "").toLowerCase().includes(s)
    );
  }, [readyOrders, search]);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(selectedIds);
      toast.success(`${selectedIds.length} order(s) deleted`);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete orders");
    }
  };

  const handleReturnToPending = async () => {
    try {
      // Group selected orders by orderNo and sum quantities
      const selectedOrders = filteredOrders.filter((o) => selectedIds.includes(o.orderId));
      const groupedByOrderNo = new Map<string, number>();
      for (const order of selectedOrders) {
        const existing = groupedByOrderNo.get(order.orderNo) ?? 0;
        groupedByOrderNo.set(order.orderNo, existing + getQuantityAsNumber(order.quantity));
      }
      const requests: [string, bigint][] = Array.from(groupedByOrderNo.entries()).map(
        ([orderNo, qty]) => [orderNo, BigInt(qty)]
      );
      await returnMutation.mutateAsync(requests);
      toast.success(`${selectedIds.length} order(s) returned to pending`);
      setSelectedIds([]);
      setShowReturnConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to return orders");
    }
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
          placeholder="Search ready orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {selectedIds.length > 0 && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReturnConfirm(true)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Return to Pending ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete ({selectedIds.length})
            </Button>
          </>
        )}
      </div>

      <OrderTable
        orders={filteredOrders}
        showCheckboxes
        externalSelectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        readOnly
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} order(s)? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReturnConfirm} onOpenChange={setShowReturnConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return to Pending</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to return {selectedIds.length} order(s) to pending status?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReturnToPending}
              disabled={returnMutation.isPending}
            >
              {returnMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { ReadyTab };

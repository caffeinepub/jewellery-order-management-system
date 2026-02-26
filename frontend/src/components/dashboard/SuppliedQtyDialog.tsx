import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order } from "../../backend";
import { useBatchSupplyRBOrders } from "../../hooks/useQueries";
import { getQuantityAsNumber } from "../../utils/orderNormalizer";
import { toast } from "sonner";

interface SuppliedQtyDialogProps {
  orders: Order[];
  onClose: () => void;
}

export function SuppliedQtyDialog({ orders, onClose }: SuppliedQtyDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suppliedQty, setSuppliedQty] = useState("");
  const [processedOrders, setProcessedOrders] = useState<Array<[string, bigint]>>([]);
  const queryClient = useQueryClient();
  const batchSupplyMutation = useBatchSupplyRBOrders();

  const currentOrder = orders[currentIndex];
  const isLastOrder = currentIndex === orders.length - 1;
  const maxQty = currentOrder ? getQuantityAsNumber(currentOrder.quantity) : 0;

  const handleNext = async () => {
    const qty = parseInt(suppliedQty, 10);
    if (isNaN(qty) || qty < 0 || qty > maxQty) {
      toast.error(`Please enter a valid quantity between 0 and ${maxQty}`);
      return;
    }

    const newProcessed: Array<[string, bigint]> = [
      ...processedOrders,
      [currentOrder.orderId, BigInt(qty)],
    ];

    if (isLastOrder) {
      try {
        await batchSupplyMutation.mutateAsync(newProcessed);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        toast.success("Orders processed successfully");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to process orders");
      }
    } else {
      setProcessedOrders(newProcessed);
      setCurrentIndex(currentIndex + 1);
      setSuppliedQty("");
    }
  };

  const handleCancel = async () => {
    if (processedOrders.length > 0) {
      try {
        await batchSupplyMutation.mutateAsync(processedOrders);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        toast.success("Partial orders processed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to process partial orders");
      }
    }
    onClose();
  };

  if (!currentOrder) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supply RB Order</DialogTitle>
          <DialogDescription>
            Order {currentIndex + 1} of {orders.length}: {currentOrder.orderNo} — {currentOrder.design}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Order No:</span>{" "}
              <span className="font-medium">{currentOrder.orderNo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Design:</span>{" "}
              <span className="font-medium">{currentOrder.design}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Product:</span>{" "}
              <span className="font-medium">{currentOrder.product}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ordered Qty:</span>{" "}
              <span className="font-medium text-gold">{maxQty}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplied-qty">Supplied Quantity (max: {maxQty})</Label>
            <Input
              id="supplied-qty"
              type="number"
              min={0}
              max={maxQty}
              value={suppliedQty}
              onChange={(e) => setSuppliedQty(e.target.value)}
              placeholder={`Enter qty (0–${maxQty})`}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={batchSupplyMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            disabled={batchSupplyMutation.isPending || suppliedQty === ""}
            className="bg-gold hover:bg-gold-hover text-white"
          >
            {batchSupplyMutation.isPending
              ? "Processing..."
              : isLastOrder
              ? "Finish"
              : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

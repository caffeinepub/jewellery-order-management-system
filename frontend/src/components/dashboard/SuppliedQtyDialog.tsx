import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SuppliedQtyDialogProps {
  orders: Order[];
  onClose: () => void;
}

// All query keys that must be refreshed after a supply/split operation
const INVALIDATE_KEYS = [
  ["orders"],
  ["readyOrders"],
  ["ordersWithMappings"],
  ["unmappedOrders"],
  ["totalOrdersSummary"],
  ["readyOrdersSummary"],
  ["hallmarkOrdersSummary"],
];

export default function SuppliedQtyDialog({
  orders,
  onClose,
}: SuppliedQtyDialogProps) {
  // currentIndex tracks which RB order we are currently prompting for
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suppliedQty, setSuppliedQty] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const currentOrder = orders[currentIndex];

  // Reset supplied qty whenever we move to a new order
  useEffect(() => {
    if (currentOrder) {
      setSuppliedQty(Number(currentOrder.quantity));
    }
  }, [currentIndex, currentOrder]);

  const invalidateAllQueries = async () => {
    await Promise.all(
      INVALIDATE_KEYS.map((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      )
    );
  };

  const processCurrentOrder = async () => {
    if (!actor) {
      toast.error("Actor not initialized");
      return;
    }

    if (suppliedQty <= 0) {
      toast.error("Supplied quantity must be greater than 0");
      return;
    }

    if (suppliedQty > Number(currentOrder.quantity)) {
      toast.error("Supplied quantity cannot exceed order quantity");
      return;
    }

    setIsProcessing(true);
    try {
      // Use batchSupplyRBOrders for proper partial-split handling with originalOrderId linkage
      await actor.batchSupplyRBOrders([[currentOrder.orderId, BigInt(suppliedQty)]]);

      if (suppliedQty === Number(currentOrder.quantity)) {
        toast.success(`Order ${currentOrder.orderNo} marked as Ready`);
      } else {
        toast.success(
          `Order ${currentOrder.orderNo} split: ${suppliedQty} marked as Ready, ${Number(currentOrder.quantity) - suppliedQty} remains Pending`
        );
      }

      // Move to next order or close if done
      if (currentIndex < orders.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // All orders processed — invalidate all queries (including summaries) and close
        await invalidateAllQueries();
        onClose();
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to supply order";
      toast.error(errorMessage);
      console.error("Error supplying order:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    // If at least one order was already processed, invalidate queries before closing
    if (currentIndex > 0) {
      await invalidateAllQueries();
    }
    onClose();
  };

  if (!currentOrder) return null;

  const isLastOrder = currentIndex === orders.length - 1;
  const totalOrders = orders.length;

  return (
    <Dialog open={orders.length > 0} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Supply RB Order
            {totalOrders > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({currentIndex + 1} of {totalOrders})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Enter the supplied quantity for order{" "}
            <strong>{currentOrder.orderNo}</strong>. If you supply the full
            quantity ({Number(currentOrder.quantity)}), the order will move to
            Ready. If you supply less, the order will split into Ready and
            Pending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="supplied-qty">Supplied Quantity</Label>
            <Input
              id="supplied-qty"
              type="number"
              min="1"
              max={Number(currentOrder.quantity)}
              value={suppliedQty}
              onChange={(e) => setSuppliedQty(Number(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Order quantity: {Number(currentOrder.quantity)} | Weight per unit:{" "}
              {currentOrder.weightPerUnit.toFixed(3)}g | Total weight:{" "}
              {(currentOrder.weightPerUnit * suppliedQty).toFixed(3)}g
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={processCurrentOrder}
            disabled={isProcessing}
            className="bg-gold hover:bg-gold-hover"
          >
            {isProcessing
              ? "Processing..."
              : isLastOrder
              ? "Confirm"
              : "Confirm & Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

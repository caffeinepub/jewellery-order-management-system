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
import { useSupplyOrder } from "@/hooks/useQueries";
import { toast } from "sonner";

interface SuppliedQtyDialogProps {
  orders: Order[];
  onClose: () => void;
}

export default function SuppliedQtyDialog({
  orders,
  onClose,
}: SuppliedQtyDialogProps) {
  const [suppliedQty, setSuppliedQty] = useState<number>(0);
  const supplyOrderMutation = useSupplyOrder();

  const isSingleOrder = orders.length === 1;
  const order = orders[0];

  useEffect(() => {
    if (isSingleOrder) {
      setSuppliedQty(Number(order.quantity));
    }
  }, [isSingleOrder, order]);

  const handleConfirm = async () => {
    if (!isSingleOrder) {
      // Multiple orders: supply full quantity for all
      try {
        for (const ord of orders) {
          await supplyOrderMutation.mutateAsync({
            orderId: ord.orderId,
            suppliedQuantity: Number(ord.quantity),
          });
        }
        toast.success(`${orders.length} order(s) marked as Ready`);
        onClose();
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to supply orders";
        toast.error(errorMessage);
        console.error("Error supplying orders:", error);
      }
    } else {
      // Single order: allow custom quantity
      if (suppliedQty <= 0) {
        toast.error("Supplied quantity must be greater than 0");
        return;
      }

      if (suppliedQty > Number(order.quantity)) {
        toast.error("Supplied quantity cannot exceed order quantity");
        return;
      }

      try {
        await supplyOrderMutation.mutateAsync({
          orderId: order.orderId,
          suppliedQuantity: suppliedQty,
        });
        
        if (suppliedQty === Number(order.quantity)) {
          toast.success("Order marked as Ready");
        } else {
          toast.success(`Order split: ${suppliedQty} marked as Ready, ${Number(order.quantity) - suppliedQty} remains Pending`);
        }
        onClose();
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to supply order";
        toast.error(errorMessage);
        console.error("Error supplying order:", error);
      }
    }
  };

  return (
    <Dialog open={orders.length > 0} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supply RB Order{!isSingleOrder && "s"}</DialogTitle>
          <DialogDescription>
            {isSingleOrder
              ? `Enter the supplied quantity for order ${order.orderNo}. If you supply the full quantity (${Number(order.quantity)}), the order will move to Ready. If you supply less, the order will split into Ready and Pending.`
              : `Confirm to mark ${orders.length} RB orders as Ready with full quantity.`}
          </DialogDescription>
        </DialogHeader>

        {isSingleOrder && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplied-qty">Supplied Quantity</Label>
              <Input
                id="supplied-qty"
                type="number"
                min="1"
                max={Number(order.quantity)}
                value={suppliedQty}
                onChange={(e) => setSuppliedQty(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Order quantity: {Number(order.quantity)}
              </p>
            </div>
          </div>
        )}

        {!isSingleOrder && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The following orders will be marked as Ready:
            </p>
            <ul className="mt-2 space-y-1">
              {orders.map((ord) => (
                <li key={ord.orderId} className="text-sm">
                  {ord.orderNo} - Qty: {Number(ord.quantity)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={supplyOrderMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={supplyOrderMutation.isPending}
            className="bg-gold hover:bg-gold-hover"
          >
            {supplyOrderMutation.isPending ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

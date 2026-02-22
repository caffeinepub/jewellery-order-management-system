import { useState } from 'react';
import { Order } from '@/backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSupplyOrder } from '@/hooks/useQueries';

interface SuppliedQtyDialogProps {
  orders: Order[];
  onClose: () => void;
}

export default function SuppliedQtyDialog({ orders, onClose }: SuppliedQtyDialogProps) {
  const [suppliedQty, setSuppliedQty] = useState('');
  const [error, setError] = useState('');
  const supplyOrderMutation = useSupplyOrder();

  const isSingleOrder = orders.length === 1;
  const order = orders[0];

  const handleConfirm = async () => {
    if (isSingleOrder) {
      const qty = Number(suppliedQty);
      const orderQty = Number(order.quantity);

      if (!suppliedQty || isNaN(qty)) {
        setError('Please enter a valid quantity');
        return;
      }

      if (qty <= 0) {
        setError('Quantity must be greater than 0');
        return;
      }

      if (qty > orderQty) {
        setError(`Supplied quantity cannot exceed order quantity (${orderQty})`);
        return;
      }

      try {
        await supplyOrderMutation.mutateAsync({
          orderId: order.orderId,
          suppliedQuantity: qty,
        });
        toast.success('Order supplied successfully');
        onClose();
      } catch (error) {
        toast.error('Failed to supply order');
        console.error(error);
      }
    } else {
      // For multiple orders, supply full quantities
      try {
        for (const ord of orders) {
          await supplyOrderMutation.mutateAsync({
            orderId: ord.orderId,
            suppliedQuantity: Number(ord.quantity),
          });
        }
        toast.success(`${orders.length} orders supplied successfully`);
        onClose();
      } catch (error) {
        toast.error('Failed to supply orders');
        console.error(error);
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Supplied Quantity</DialogTitle>
          <DialogDescription>
            {isSingleOrder
              ? 'This is an RB order. Please enter the supplied quantity before marking as Ready.'
              : `You have selected ${orders.length} RB orders. Confirming will supply the full quantity for each order.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isSingleOrder ? (
            <>
              <div className="space-y-2">
                <Label>Order Details</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Order No: {order.orderNo}</div>
                  <div>Design: {order.design}</div>
                  <div>Total Quantity: {Number(order.quantity)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplied-qty">Supplied Quantity</Label>
                <Input
                  id="supplied-qty"
                  type="number"
                  min="1"
                  max={Number(order.quantity)}
                  value={suppliedQty}
                  onChange={(e) => {
                    setSuppliedQty(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter supplied quantity"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Selected Orders</Label>
              <div className="text-sm text-muted-foreground space-y-1 max-h-60 overflow-y-auto">
                {orders.map((ord) => (
                  <div key={ord.orderId} className="py-1 border-b last:border-b-0">
                    <div>Order No: {ord.orderNo}</div>
                    <div>Design: {ord.design}</div>
                    <div>Quantity: {Number(ord.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={supplyOrderMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={supplyOrderMutation.isPending}>
            {supplyOrderMutation.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

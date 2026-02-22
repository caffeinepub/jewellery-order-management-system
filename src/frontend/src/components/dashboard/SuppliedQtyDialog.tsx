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

interface SuppliedQtyDialogProps {
  order: Order;
  onClose: () => void;
  onConfirm: (suppliedQty: number) => void;
}

export default function SuppliedQtyDialog({ order, onClose, onConfirm }: SuppliedQtyDialogProps) {
  const [suppliedQty, setSuppliedQty] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
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

    onConfirm(qty);
    toast.success('Status updated successfully');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Supplied Quantity</DialogTitle>
          <DialogDescription>
            This is an RB order. Please enter the supplied quantity before marking as Ready.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

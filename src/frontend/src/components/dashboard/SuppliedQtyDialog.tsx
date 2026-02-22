import { useState } from 'react';
import { Order } from '../../backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface SuppliedQtyDialogProps {
  order: Order;
  onSubmit: (suppliedQty: number) => void;
  onCancel: () => void;
}

export function SuppliedQtyDialog({ order, onSubmit, onCancel }: SuppliedQtyDialogProps) {
  const [suppliedQty, setSuppliedQty] = useState<string>('');
  const [error, setError] = useState<string>('');

  const totalQty = Number(order.quantity);

  const handleSubmit = () => {
    const qty = parseInt(suppliedQty, 10);

    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (qty > totalQty) {
      setError(`Supplied quantity cannot exceed total order quantity (${totalQty})`);
      return;
    }

    onSubmit(qty);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Supplied Qty</DialogTitle>
          <DialogDescription>
            Order: {order.orderNo} | Design: {order.design}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="totalQty">Total Order Quantity</Label>
            <Input id="totalQty" value={totalQty} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suppliedQty">Supplied Quantity *</Label>
            <Input
              id="suppliedQty"
              type="number"
              min="1"
              max={totalQty}
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
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

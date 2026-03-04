import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Order } from "../../backend";
import { useBatchSupplyRBOrders } from "../../hooks/useQueries";

interface SupplyEntry {
  order: Order;
  suppliedQty: number;
}

interface SuppliedQtyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
}

export default function SuppliedQtyDialog({
  open,
  onOpenChange,
  orders,
}: SuppliedQtyDialogProps) {
  const [entries, setEntries] = useState<SupplyEntry[]>(() =>
    orders.map((o) => ({ order: o, suppliedQty: Number(o.quantity) })),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const batchSupply = useBatchSupplyRBOrders();

  // Reset entries when orders change
  const resetEntries = () => {
    setEntries(
      orders.map((o) => ({ order: o, suppliedQty: Number(o.quantity) })),
    );
    setError(null);
    setSuccess(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (val) resetEntries();
    else {
      setError(null);
      setSuccess(false);
    }
    onOpenChange(val);
  };

  const updateQty = (orderId: string, val: string) => {
    const num = Number.parseInt(val, 10);
    setEntries((prev) =>
      prev.map((e) =>
        e.order.orderId === orderId
          ? { ...e, suppliedQty: Number.isNaN(num) ? 0 : num }
          : e,
      ),
    );
    setError(null);
  };

  const validate = (): string | null => {
    for (const entry of entries) {
      const available = Number(entry.order.quantity);
      if (entry.suppliedQty <= 0) {
        return `Order ${entry.order.orderNo} (${entry.order.design}): Supplied quantity must be greater than 0.`;
      }
      if (entry.suppliedQty > available) {
        return `Order ${entry.order.orderNo} (${entry.order.design}): Supplied quantity (${entry.suppliedQty}) exceeds available quantity (${available}).`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await batchSupply.mutateAsync(
        entries.map((e) => ({
          orderId: e.order.orderId,
          suppliedQty: e.suppliedQty,
        })),
      );
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const hasPartialSupply = entries.some(
    (e) => e.suppliedQty > 0 && e.suppliedQty < Number(e.order.quantity),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Supply RB Orders</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {entries.map((entry) => {
            const available = Number(entry.order.quantity);
            const isPartial =
              entry.suppliedQty > 0 && entry.suppliedQty < available;
            const isInvalid =
              entry.suppliedQty <= 0 || entry.suppliedQty > available;

            return (
              <div
                key={entry.order.orderId}
                className="border border-border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-foreground">
                      {entry.order.orderNo}
                    </span>
                    <span className="text-muted-foreground text-xs ml-2">
                      {entry.order.design}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Available: {available}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-xs w-24 shrink-0">Supply Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    max={available}
                    value={entry.suppliedQty}
                    onChange={(e) =>
                      updateQty(entry.order.orderId, e.target.value)
                    }
                    className={`h-8 text-sm ${isInvalid ? "border-destructive" : ""}`}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    / {available}
                  </span>
                </div>

                {isPartial && (
                  <p className="text-xs text-amber-500">
                    ⚠ Partial supply — {available - entry.suppliedQty} unit
                    {available - entry.suppliedQty !== 1 ? "s" : ""} will remain
                    in Total Orders
                  </p>
                )}
                {isInvalid && entry.suppliedQty !== 0 && (
                  <p className="text-xs text-destructive">Invalid quantity</p>
                )}
              </div>
            );
          })}
        </div>

        {hasPartialSupply && !error && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 text-xs">
              Some orders have partial supply. The remaining quantities will
              stay in Total Orders and a new Ready row will be created for the
              supplied portion.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 text-xs">
              Orders supplied successfully!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={batchSupply.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={batchSupply.isPending || success}
            className="bg-primary text-primary-foreground"
          >
            {batchSupply.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Supplying…
              </>
            ) : (
              "Confirm Supply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

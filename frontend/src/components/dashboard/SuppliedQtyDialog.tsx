import { useState, useEffect } from "react";
import { Order, OrderType } from "@/backend";
import { useBatchSupplyRBOrders } from "@/hooks/useQueries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package } from "lucide-react";

interface ConsolidatedOrder extends Order {
  _fragmentIds?: string[];
}

interface SuppliedQtyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: ConsolidatedOrder[];
}

interface OrderEntry {
  order: ConsolidatedOrder;
  suppliedQty: string;
  error: string;
}

export default function SuppliedQtyDialog({
  open,
  onOpenChange,
  orders,
}: SuppliedQtyDialogProps) {
  const [entries, setEntries] = useState<OrderEntry[]>([]);
  const supplyMutation = useBatchSupplyRBOrders();

  // Initialise entries whenever the dialog opens with new orders
  useEffect(() => {
    if (open && orders.length > 0) {
      setEntries(
        orders.map((o) => ({
          order: o,
          suppliedQty: String(Number(o.quantity)),
          error: "",
        }))
      );
    }
  }, [open, orders]);

  function updateQty(index: number, value: string) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, suppliedQty: value, error: "" } : e
      )
    );
  }

  function validate(): boolean {
    let valid = true;
    setEntries((prev) =>
      prev.map((e) => {
        const qty = parseInt(e.suppliedQty, 10);
        const max = Number(e.order.quantity);
        if (isNaN(qty) || qty <= 0) {
          valid = false;
          return { ...e, error: "Enter a valid quantity greater than 0" };
        }
        if (qty > max) {
          valid = false;
          return {
            ...e,
            error: `Cannot exceed ordered quantity (${max})`,
          };
        }
        return e;
      })
    );
    return valid;
  }

  async function handleConfirm() {
    if (!validate()) return;

    // Build the payload: for each consolidated RB order, we supply against
    // the representative orderId (first fragment). The backend's batchSupplyRBOrders
    // will create a Ready fragment and update/remove the pending remainder.
    //
    // If the consolidated row has multiple fragment IDs (returned-to-pending scenario),
    // we need to supply against the representative and the backend handles the rest.
    // We use the representative orderId (order.orderId) which is the first fragment.
    const payload: Array<[string, bigint]> = entries.map((e) => [
      e.order.orderId,
      BigInt(parseInt(e.suppliedQty, 10)),
    ]);

    supplyMutation.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            Supply RB Orders
          </DialogTitle>
          <DialogDescription>
            Enter the quantity being supplied for each Regional Buffer order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {entries.map((entry, index) => {
            const max = Number(entry.order.quantity);
            const supplied = parseInt(entry.suppliedQty, 10);
            const isPartial = !isNaN(supplied) && supplied > 0 && supplied < max;
            const isFull = !isNaN(supplied) && supplied === max;

            return (
              <div
                key={entry.order.orderId}
                className="rounded-lg border bg-muted/30 p-3 space-y-3"
              >
                {/* Order details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order No: </span>
                    <span className="font-medium">{entry.order.orderNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Design: </span>
                    <span className="font-medium">{entry.order.design}</span>
                  </div>
                  {entry.order.genericName && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Generic Name:{" "}
                      </span>
                      <span className="font-medium">
                        {entry.order.genericName}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">
                      Total Ordered:{" "}
                    </span>
                    <span className="font-medium">{max}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight: </span>
                    <span className="font-medium">
                      {entry.order.weight.toFixed(2)} gm
                    </span>
                  </div>
                </div>

                {/* Qty input */}
                <div className="space-y-1">
                  <Label htmlFor={`qty-${index}`} className="text-sm">
                    Supplied Quantity
                  </Label>
                  <Input
                    id={`qty-${index}`}
                    type="number"
                    min={1}
                    max={max}
                    value={entry.suppliedQty}
                    onChange={(e) => updateQty(index, e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={entry.error ? "border-destructive" : ""}
                  />
                  {entry.error && (
                    <p className="text-xs text-destructive">{entry.error}</p>
                  )}
                  {isPartial && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Partial supply: {supplied} of {max} — {max - supplied}{" "}
                      will remain pending
                    </p>
                  )}
                  {isFull && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Full supply: all {max} units will be marked ready
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={supplyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={supplyMutation.isPending}
            className="gap-1.5"
          >
            {supplyMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Confirm Supply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

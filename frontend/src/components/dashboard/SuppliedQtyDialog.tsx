import React, { useState, useEffect } from "react";
import { Order } from "../../backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { useBatchSupplyRBOrders } from "../../hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";

export interface SuppliedQtyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rbOrders?: Order[];
  orders?: Order[];
}

interface SupplyEntry {
  orderId: string;
  orderNo: string;
  originalQty: number;
  suppliedQty: number;
}

const SuppliedQtyDialog: React.FC<SuppliedQtyDialogProps> = ({
  open,
  onOpenChange,
  rbOrders,
  orders,
}) => {
  // Accept either rbOrders or orders prop for backward compatibility
  const ordersToProcess = rbOrders ?? orders ?? [];

  const [entries, setEntries] = useState<SupplyEntry[]>([]);
  const supplyMutation = useBatchSupplyRBOrders();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && ordersToProcess.length > 0) {
      setEntries(
        ordersToProcess.map((o) => ({
          orderId: o.orderId,
          orderNo: o.orderNo,
          originalQty: Number(o.quantity),
          suppliedQty: Number(o.quantity),
        }))
      );
    }
  }, [open, ordersToProcess.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQtyChange = (orderId: string, value: string) => {
    const num = parseInt(value, 10);
    setEntries((prev) =>
      prev.map((e) =>
        e.orderId === orderId
          ? { ...e, suppliedQty: isNaN(num) ? 0 : Math.min(num, e.originalQty) }
          : e
      )
    );
  };

  const hasPartialSupply = entries.some((e) => e.suppliedQty < e.originalQty);

  const handleConfirm = async () => {
    try {
      await supplyMutation.mutateAsync(
        entries.map((e) => ({ orderId: e.orderId, suppliedQuantity: BigInt(e.suppliedQty) }))
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      onOpenChange(false);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Supply Orders</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto py-1">
          {entries.map((entry) => {
            const remaining = entry.originalQty - entry.suppliedQty;
            const isPartial = entry.suppliedQty < entry.originalQty;
            return (
              <div key={entry.orderId} className="flex flex-col gap-1 border border-border rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{entry.orderNo}</span>
                  <span className="text-xs text-muted-foreground">
                    Original: {entry.originalQty}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-24 shrink-0">
                    Supplied Qty:
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={entry.originalQty}
                    value={entry.suppliedQty}
                    onChange={(e) => handleQtyChange(entry.orderId, e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
                {isPartial && (
                  <p className="text-xs text-amber-500">
                    {remaining} unit(s) will remain as Pending
                  </p>
                )}
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No orders to supply.</p>
          )}
        </div>

        {hasPartialSupply && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs text-amber-500">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Some orders are partially supplied. The supplied portion will be marked as Ready and
              the remaining will stay as Pending.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={supplyMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={supplyMutation.isPending || entries.length === 0 || entries.some((e) => e.suppliedQty <= 0)}
          >
            {supplyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Supplying...
              </>
            ) : (
              "Confirm Supply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuppliedQtyDialog;

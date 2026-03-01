import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Order } from "@/backend";
import { useBatchSupplyRBOrders } from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SuppliedQtyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rbOrders: Order[];
}

interface OrderEntry {
  orderId: string;
  orderNo: string;
  design: string;
  maxQty: number;
  suppliedQty: number;
}

export default function SuppliedQtyDialog({
  open,
  onOpenChange,
  rbOrders,
}: SuppliedQtyDialogProps) {
  const [entries, setEntries] = useState<OrderEntry[]>([]);
  const batchSupplyMutation = useBatchSupplyRBOrders();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && rbOrders.length > 0) {
      setEntries(
        rbOrders.map((o) => ({
          orderId: o.orderId,
          orderNo: o.orderNo,
          design: o.design,
          maxQty: Number(o.quantity),
          suppliedQty: Number(o.quantity), // pre-fill with full remaining quantity
        }))
      );
    }
  }, [open, rbOrders]);

  const handleQtyChange = (orderId: string, value: string) => {
    const num = parseInt(value, 10);
    setEntries((prev) =>
      prev.map((e) =>
        e.orderId === orderId
          ? { ...e, suppliedQty: isNaN(num) ? 0 : Math.min(num, e.maxQty) }
          : e
      )
    );
  };

  const handleSubmit = async () => {
    const validEntries = entries.filter((e) => e.suppliedQty > 0);
    if (validEntries.length === 0) {
      toast.error("Please enter at least one supplied quantity");
      return;
    }

    try {
      await batchSupplyMutation.mutateAsync(
        validEntries.map((e) => [e.orderId, BigInt(e.suppliedQty)] as [string, bigint])
      );

      // Force a full refetch to update all tabs with the latest split-row state
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      await queryClient.refetchQueries({ queryKey: ["orders"] });

      toast.success(`Successfully supplied ${validEntries.length} order(s)`);
      onOpenChange(false);
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.error("Failed to supply orders");
    }
  };

  const totalSupplied = entries.reduce((sum, e) => sum + e.suppliedQty, 0);
  const totalMax = entries.reduce((sum, e) => sum + e.maxQty, 0);

  // Check if any entry is a partial supply
  const hasPartialSupply = entries.some((e) => e.suppliedQty > 0 && e.suppliedQty < e.maxQty);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gold" />
            Supply RB Orders
          </DialogTitle>
          <DialogDescription>
            Enter the quantity supplied for each order. Leave at 0 to skip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {entries.map((entry) => {
            const isPartial = entry.suppliedQty > 0 && entry.suppliedQty < entry.maxQty;
            return (
              <div key={entry.orderId} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{entry.orderNo}</p>
                    <p className="text-xs text-muted-foreground">{entry.design}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pending: {entry.maxQty}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`qty-${entry.orderId}`} className="text-xs w-20 shrink-0">
                    Supplied Qty
                  </Label>
                  <Input
                    id={`qty-${entry.orderId}`}
                    type="number"
                    min={0}
                    max={entry.maxQty}
                    value={entry.suppliedQty}
                    onChange={(e) => handleQtyChange(entry.orderId, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                {entry.maxQty > 0 && (
                  <Progress
                    value={(entry.suppliedQty / entry.maxQty) * 100}
                    className="h-1.5"
                  />
                )}
                {isPartial && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3 shrink-0" />
                    <span>
                      Partial supply: {entry.suppliedQty} supplied, {entry.maxQty - entry.suppliedQty} will remain pending
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {entries.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total supplied:</span>
              <span className="font-semibold">
                {totalSupplied} / {totalMax}
              </span>
            </div>
            {hasPartialSupply && (
              <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Orders with partial supply will stay in Total Orders with the remaining quantity. The supplied portion will appear in the Ready tab.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={batchSupplyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={batchSupplyMutation.isPending || entries.every((e) => e.suppliedQty === 0)}
            className="bg-gold hover:bg-gold-hover text-white"
          >
            {batchSupplyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Supplying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Supply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Order } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Package, Hash, Weight, AlertCircle } from "lucide-react";

interface SuppliedQtyDialogProps {
  orders: Order[];
  onClose: () => void;
}

export default function SuppliedQtyDialog({
  orders,
  onClose,
}: SuppliedQtyDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suppliedQty, setSuppliedQty] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const currentOrder = orders[currentIndex];
  const maxQty = currentOrder ? Number(currentOrder.quantity) : 0;

  // Reset supplied qty whenever we move to a new order — default to full quantity
  useEffect(() => {
    if (currentOrder) {
      setSuppliedQty(String(Number(currentOrder.quantity)));
      setValidationError("");
    }
  }, [currentIndex, currentOrder]);

  const validateQty = (value: string): string => {
    const num = Number(value);
    if (!value || value.trim() === "") return "Supplied quantity is required";
    if (isNaN(num) || !Number.isInteger(num)) return "Please enter a whole number";
    if (num <= 0) return "Supplied quantity must be greater than 0";
    if (num > maxQty) return `Supplied quantity cannot exceed order quantity (${maxQty})`;
    return "";
  };

  const handleQtyChange = (value: string) => {
    setSuppliedQty(value);
    if (validationError) {
      setValidationError(validateQty(value));
    }
  };

  const invalidateQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    await queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    await queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    await queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
  };

  const processCurrentOrder = async () => {
    if (!actor) {
      toast.error("Actor not initialized");
      return;
    }

    const error = validateQty(suppliedQty);
    if (error) {
      setValidationError(error);
      return;
    }

    const qty = Number(suppliedQty);

    setIsProcessing(true);
    try {
      await actor.batchSupplyRBOrders([[currentOrder.orderId, BigInt(qty)]]);

      if (qty === maxQty) {
        toast.success(`Order ${currentOrder.orderNo} fully marked as Ready (${qty} qty)`);
      } else {
        const remaining = maxQty - qty;
        toast.success(
          `Order ${currentOrder.orderNo} split: ${qty} qty → Ready, ${remaining} qty → Pending`
        );
      }

      if (currentIndex < orders.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await invalidateQueries();
        onClose();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to supply order";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (currentIndex > 0) {
      await invalidateQueries();
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isProcessing) {
      processCurrentOrder();
    }
  };

  if (!currentOrder) return null;

  const isLastOrder = currentIndex === orders.length - 1;
  const totalOrders = orders.length;
  const suppliedNum = Number(suppliedQty);
  const isPartialSupply =
    !isNaN(suppliedNum) && suppliedNum > 0 && suppliedNum < maxQty;
  const isFullSupply =
    !isNaN(suppliedNum) && suppliedNum === maxQty;

  return (
    <Dialog open={orders.length > 0} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              Supply RB Order
            </DialogTitle>
            {totalOrders > 1 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {currentIndex + 1} of {totalOrders}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Order Details Card */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Order No</span>
            <span className="ml-auto font-semibold text-sm font-mono">
              {currentOrder.orderNo}
            </span>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Design Code</span>
            <span className="ml-auto font-semibold text-sm font-mono">
              {currentOrder.design}
            </span>
          </div>
          {currentOrder.genericName && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground pl-5">Generic Name</span>
                <span className="ml-auto text-sm text-foreground">
                  {currentOrder.genericName}
                </span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex items-center gap-2">
            <Weight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Total Ordered Qty</span>
            <span className="ml-auto font-bold text-sm text-primary">
              {maxQty}
            </span>
          </div>
        </div>

        {/* Supplied Quantity Input */}
        <div className="space-y-2">
          <Label htmlFor="supplied-qty" className="text-sm font-medium">
            Supplied Quantity
          </Label>
          <Input
            id="supplied-qty"
            type="number"
            min="1"
            max={maxQty}
            value={suppliedQty}
            onChange={(e) => handleQtyChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={validationError ? "border-destructive focus-visible:ring-destructive" : ""}
            placeholder={`Enter qty (max ${maxQty})`}
            autoFocus
          />
          {validationError && (
            <div className="flex items-center gap-1.5 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          {!validationError && isPartialSupply && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Partial supply: {suppliedNum} qty → Ready, {maxQty - suppliedNum} qty → stays Pending
            </p>
          )}
          {!validationError && isFullSupply && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Full supply: entire order will move to Ready
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={processCurrentOrder}
            disabled={isProcessing || !suppliedQty}
            className="bg-gold hover:bg-gold-hover"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : isLastOrder ? (
              "Confirm"
            ) : (
              "Confirm & Next"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { type Order, OrderStatus } from "../../backend";
import { useAuth } from "../../context/AuthContext";
import {
  useBatchUpdateOrderStatus,
  useGenericNameResolver,
  useKarigarResolver,
  useMarkOrdersAsPending,
  useReturnReadyOrderToPending,
} from "../../hooks/useQueries";
import { AgeingBadge } from "../../utils/ageingBadge";
import {
  exportAllToPDF,
  exportOrdersToImage,
  exportSelectedToPDF,
} from "../../utils/exportUtils";
import DesignImageModal from "./DesignImageModal";

interface ReadyTabProps {
  orders: Order[];
  isError?: boolean;
}

// Last Action badge component
function LastActionBadge({ lastAction }: { lastAction?: string }) {
  if (!lastAction)
    return <span className="text-muted-foreground text-xs">—</span>;
  const parts = lastAction.split(" • ");
  const status = parts[0] ?? "";
  const color =
    status === "Ready"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : status === "Pending"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : status === "Returned"
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${color} whitespace-nowrap`}
    >
      {lastAction}
    </span>
  );
}

// Helper: compute dynamic weight
function dynamicWeight(order: Order): number {
  return order.weight * Number(order.quantity);
}

// Helper: count unique order numbers
function uniqueOrderCount(orders: Order[]): number {
  return new Set(orders.map((o) => o.orderNo)).size;
}

interface ReturnDialogState {
  open: boolean;
  order: Order | null;
}

export function ReadyTab({ orders, isError }: ReadyTabProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);
  const [returnDialog, setReturnDialog] = useState<ReturnDialogState>({
    open: false,
    order: null,
  });
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnError, setReturnError] = useState<string | null>(null);

  const markAsPending = useMarkOrdersAsPending();
  const returnToPending = useReturnReadyOrderToPending();
  const moveToHallmark = useBatchUpdateOrderStatus();
  const { currentUser } = useAuth();
  // Single source of truth: resolve karigar and generic name dynamically from master design mappings
  const resolveKarigar = useKarigarResolver();
  const resolveGenericName = useGenericNameResolver();

  // Filter: only Ready orders with qty > 0
  const readyOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status === OrderStatus.Ready && Number(o.quantity) > 0,
      ),
    [orders],
  );

  // Search filter — includes resolved generic name for accurate search
  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return readyOrders;
    const q = searchText.toLowerCase();
    return readyOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.design.toLowerCase().includes(q) ||
        (o.genericName ?? "").toLowerCase().includes(q) ||
        resolveGenericName(o.design).toLowerCase().includes(q) ||
        (o.karigarName ?? "").toLowerCase().includes(q),
    );
  }, [readyOrders, searchText, resolveGenericName]);

  // Group by design code
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filteredOrders) {
      const key = o.design;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filteredOrders]);

  const toggleGroup = (design: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(design)) next.delete(design);
      else next.add(design);
      return next;
    });
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectGroup = (design: string) => {
    const groupOrders = groups.get(design) ?? [];
    const allSelected = groupOrders.every((o) => selectedIds.has(o.orderId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const o of groupOrders) next.delete(o.orderId);
      } else {
        for (const o of groupOrders) next.add(o.orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.orderId)));
    }
  };

  const handleMarkAsPending = async () => {
    if (selectedIds.size === 0) return;
    await markAsPending.mutateAsync({
      orderIds: Array.from(selectedIds),
      updatedBy: currentUser?.name ?? "system",
    });
    setSelectedIds(new Set());
  };

  const handleMoveToHallmark = async () => {
    if (selectedIds.size === 0) return;
    await moveToHallmark.mutateAsync({
      orderIds: Array.from(selectedIds),
      newStatus: OrderStatus.Hallmark,
      updatedBy: currentUser?.name ?? "system",
    });
    setSelectedIds(new Set());
  };

  // ── Return dialog ──
  const openReturnDialog = (order: Order) => {
    setReturnDialog({ open: true, order });
    setReturnQty(Number(order.quantity));
    setReturnError(null);
  };

  const closeReturnDialog = () => {
    setReturnDialog({ open: false, order: null });
    setReturnQty(0);
    setReturnError(null);
  };

  const handleReturn = async () => {
    if (!returnDialog.order) return;
    setReturnError(null);

    const readyQty = Number(returnDialog.order.quantity);

    // Strict validation
    if (returnQty <= 0) {
      setReturnError("Return quantity must be greater than 0.");
      return;
    }
    if (returnQty > readyQty) {
      setReturnError(
        `Return quantity (${returnQty}) exceeds ready quantity (${readyQty}).`,
      );
      return;
    }

    try {
      await returnToPending.mutateAsync({
        orderId: returnDialog.order.orderId,
        returnedQty: returnQty,
        updatedBy: currentUser?.name ?? "system",
      });
      closeReturnDialog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReturnError(msg);
    }
  };

  // ── Summary stats ──
  const totalQty = filteredOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalWeight = filteredOrders.reduce((s, o) => s + dynamicWeight(o), 0);
  const orderCount = uniqueOrderCount(filteredOrders);

  const selectedOrders = filteredOrders.filter((o) =>
    selectedIds.has(o.orderId),
  );

  if (isError) {
    return (
      <div className="p-4 text-destructive">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <Input
          placeholder="Search order, design, karigar…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-8 text-sm max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <Button
                size="sm"
                onClick={handleMarkAsPending}
                disabled={markAsPending.isPending}
                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold border-0"
              >
                {markAsPending.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                Mark as Pending ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                onClick={handleMoveToHallmark}
                disabled={moveToHallmark.isPending}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold border-0"
              >
                {moveToHallmark.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                Move to Hallmark ({selectedIds.size})
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportOrdersToImage(filteredOrders, "Ready", "ready-orders.jpg")
            }
            className="h-8 text-xs"
          >
            Export JPEG
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportAllToPDF(filteredOrders, "ready-orders-all.pdf", "Ready")
            }
            className="h-8 text-xs"
          >
            Export PDF (All)
          </Button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportSelectedToPDF(
                  selectedOrders,
                  "ready-orders-selected.pdf",
                  "Ready",
                )
              }
              className="h-8 text-xs"
            >
              Export PDF (Selected)
            </Button>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <span>
          <span className="font-semibold text-foreground">{orderCount}</span>{" "}
          orders
        </span>
        <span>
          <span className="font-semibold text-foreground">{totalQty}</span> qty
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {totalWeight.toFixed(2)}g
          </span>{" "}
          weight
        </span>
        {selectedIds.size > 0 && (
          <span className="text-primary">{selectedIds.size} selected</span>
        )}
      </div>

      {/* Select all */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={
              selectedIds.size === filteredOrders.length &&
              filteredOrders.length > 0
            }
            onCheckedChange={toggleSelectAll}
            id="select-all-ready"
          />
          <label
            htmlFor="select-all-ready"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Select all
          </label>
        </div>
      )}

      {/* Groups */}
      {filteredOrders.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          No ready orders found.
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(groups.entries()).map(([design, groupOrders]) => {
            const isExpanded = expandedGroups.has(design);
            const groupQty = groupOrders.reduce(
              (s, o) => s + Number(o.quantity),
              0,
            );
            const groupWeight = groupOrders.reduce(
              (s, o) => s + dynamicWeight(o),
              0,
            );
            const allSelected = groupOrders.every((o) =>
              selectedIds.has(o.orderId),
            );
            const someSelected = groupOrders.some((o) =>
              selectedIds.has(o.orderId),
            );
            // Single source of truth: resolve from master design mappings, not stored order fields
            const genericName = resolveGenericName(design);
            const karigarName = resolveKarigar(design);

            return (
              <div
                key={design}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Group header */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: complex row with nested interactive elements */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(design)}
                >
                  <Checkbox
                    checked={allSelected}
                    data-state={
                      someSelected && !allSelected ? "indeterminate" : undefined
                    }
                    onCheckedChange={() => toggleSelectGroup(design)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalDesign(design);
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>

                  <span className="font-bold text-sm text-amber-500">
                    {design}
                  </span>
                  {genericName && (
                    <span className="text-xs text-muted-foreground">
                      {genericName}
                    </span>
                  )}
                  {karigarName && karigarName !== "Unassigned" && (
                    <Badge variant="outline" className="text-xs h-5">
                      {karigarName}
                    </Badge>
                  )}

                  <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Qty: {groupQty}</span>
                    <span>{groupWeight.toFixed(2)}g</span>
                    <span className="text-muted-foreground">
                      {groupOrders.length} row
                      {groupOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Group rows */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {groupOrders.map((order) => {
                      const qty = Number(order.quantity);

                      return (
                        <div
                          key={order.orderId}
                          className="flex items-center gap-2 px-3 py-2 bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => toggleSelect(order.orderId)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && toggleSelect(order.orderId)
                          }
                        >
                          <Checkbox
                            checked={selectedIds.has(order.orderId)}
                            onCheckedChange={() => toggleSelect(order.orderId)}
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Order:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {order.orderNo}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Qty:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {qty}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Wt:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {order.weight.toFixed(2)}g
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Size:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {order.size}
                              </span>
                            </div>
                            {order.orderDate && (
                              <div className="col-span-2 sm:col-span-1">
                                <AgeingBadge orderDate={order.orderDate} />
                              </div>
                            )}
                            {order.originalOrderId && (
                              <div className="col-span-2 sm:col-span-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs h-4 border-amber-500/50 text-amber-500"
                                >
                                  Partial Supply
                                </Badge>
                              </div>
                            )}
                            {/* Updated By */}
                            <div>
                              <span className="text-muted-foreground">
                                By:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {order.updatedBy ?? "—"}
                              </span>
                            </div>
                            {/* Last Action */}
                            <div className="col-span-2 sm:col-span-2">
                              <LastActionBadge lastAction={order.lastAction} />
                            </div>
                          </div>

                          {/* Return button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReturnDialog(order);
                            }}
                            title="Return to Total Orders"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Return
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={closeReturnDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Return to Total Orders</DialogTitle>
          </DialogHeader>

          {returnDialog.order && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Order: </span>
                  <span className="font-medium">
                    {returnDialog.order.orderNo}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Design: </span>
                  <span className="font-medium">
                    {returnDialog.order.design}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ready Qty: </span>
                  <span className="font-medium">
                    {Number(returnDialog.order.quantity)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Return Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={Number(returnDialog.order.quantity)}
                  value={returnQty}
                  onChange={(e) => {
                    setReturnQty(Number.parseInt(e.target.value, 10) || 0);
                    setReturnError(null);
                  }}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Max: {Number(returnDialog.order.quantity)}
                </p>
              </div>

              {returnError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {returnError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeReturnDialog}
              disabled={returnToPending.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleReturn} disabled={returnToPending.isPending}>
              {returnToPending.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Returning…
                </>
              ) : (
                "Confirm Return"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Design image modal */}
      {imageModalDesign && (
        <DesignImageModal
          designCode={imageModalDesign}
          open={!!imageModalDesign}
          onClose={() => setImageModalDesign(null)}
        />
      )}
    </div>
  );
}

export default ReadyTab;

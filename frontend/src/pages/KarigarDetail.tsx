import { useState, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  useGetAllOrders,
  useMarkOrdersAsReady,
  useGetAllDesignMappings,
} from "@/hooks/useQueries";
import { OrderStatus, OrderType, Order } from "@/backend";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FileDown, CheckSquare } from "lucide-react";
import {
  exportOrdersToImage,
  exportAllToPDF,
  exportSelectedToPDF,
  exportToExcel,
} from "@/utils/exportUtils";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";
import { resolveKarigar, buildDesignMappingsMap } from "@/utils/karigarResolver";

export default function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();

  const { data: allOrders = [], isLoading: ordersLoading } = useGetAllOrders();
  const { data: rawMappings = [], isLoading: mappingsLoading } =
    useGetAllDesignMappings();
  const markAsReadyMutation = useMarkOrdersAsReady();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);

  const decodedName = decodeURIComponent(name);

  // Build design mappings map for dynamic karigar resolution
  const designMappingsMap = useMemo(
    () => buildDesignMappingsMap(rawMappings),
    [rawMappings]
  );

  // SINGLE SOURCE OF TRUTH: filter orders by dynamically resolved karigar
  // Never use o.karigarName from the stored order record
  const karigarOrders = useMemo(
    () =>
      allOrders.filter(
        (o) =>
          resolveKarigar(o.design, designMappingsMap) === decodedName &&
          o.status === OrderStatus.Pending &&
          Number(o.quantity) > 0
      ),
    [allOrders, designMappingsMap, decodedName]
  );

  const selectedOrders = useMemo(
    () => karigarOrders.filter((o) => selectedIds.has(o.orderId)),
    [karigarOrders, selectedIds]
  );

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === karigarOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(karigarOrders.map((o) => o.orderId)));
    }
  };

  const handleMarkAsReady = () => {
    const rbOrders = selectedOrders.filter((o) => o.orderType === OrderType.RB);
    const nonRbOrders = selectedOrders.filter(
      (o) => o.orderType !== OrderType.RB
    );

    if (rbOrders.length > 0) {
      setSupplyOrders(rbOrders);
      setSupplyDialogOpen(true);
    }

    if (nonRbOrders.length > 0) {
      markAsReadyMutation.mutate(nonRbOrders.map((o) => o.orderId), {
        onSuccess: () => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            nonRbOrders.forEach((o) => next.delete(o.orderId));
            return next;
          });
        },
      });
    }
  };

  const handleExportJpeg = async () => {
    setIsExportingJpeg(true);
    try {
      await exportOrdersToImage(
        karigarOrders,
        `${decodedName} - Pending Orders`,
        `${decodedName}-orders.jpg`
      );
    } finally {
      setIsExportingJpeg(false);
    }
  };

  const handleExportPDFAll = () => {
    exportAllToPDF(karigarOrders, `${decodedName}-orders-all.pdf`);
  };

  const handleExportPDFSelected = () => {
    exportSelectedToPDF(selectedOrders, `${decodedName}-orders-selected.pdf`);
  };

  const handleExportExcel = async () => {
    await exportToExcel(karigarOrders, `${decodedName}-orders.xlsx`);
  };

  // Dynamic weight: unit_weight × qty
  const totalWeight = karigarOrders.reduce(
    (s, o) => s + o.weight * Number(o.quantity),
    0
  );
  const totalQty = karigarOrders.reduce((s, o) => s + Number(o.quantity), 0);

  const isLoading = ordersLoading || mappingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{decodedName}</h1>
          <p className="text-muted-foreground text-sm">
            {karigarOrders.length} pending order
            {karigarOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            onClick={handleMarkAsReady}
            disabled={markAsReadyMutation.isPending}
          >
            {markAsReadyMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="mr-2 h-4 w-4" />
            )}
            Mark as Ready ({selectedIds.size})
          </Button>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJpeg}
            disabled={isExportingJpeg}
          >
            {isExportingJpeg ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-1 h-4 w-4" />
            )}
            Export JPEG
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDFAll}>
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF (All)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDFSelected}
            disabled={selectedIds.size === 0}
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF (Selected)
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <FileDown className="mr-1 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      {karigarOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No pending orders for {decodedName}.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
            <Checkbox
              checked={
                selectedIds.size === karigarOrders.length &&
                karigarOrders.length > 0
              }
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium text-muted-foreground flex-1">
              Order No
            </span>
            <span className="text-sm font-medium text-muted-foreground w-32">
              Design
            </span>
            <span className="text-sm font-medium text-muted-foreground w-32">
              Generic Name
            </span>
            <span className="text-sm font-medium text-muted-foreground w-20">
              Weight
            </span>
            <span className="text-sm font-medium text-muted-foreground w-16">
              Qty
            </span>
            <span className="text-sm font-medium text-muted-foreground w-16">
              Type
            </span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {karigarOrders.map((order) => (
              <div
                key={order.orderId}
                className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(order.orderId)}
                  onCheckedChange={() => toggleOne(order.orderId)}
                />
                <span className="flex-1 text-sm font-medium">
                  {order.orderNo}
                </span>
                <span className="w-32 text-sm text-orange-500 font-bold">
                  {order.design}
                </span>
                <span className="w-32 text-sm text-muted-foreground">
                  {order.genericName ?? "—"}
                </span>
                <span className="w-20 text-sm">
                  {(order.weight * Number(order.quantity)).toFixed(2)}g
                </span>
                <span className="w-16 text-sm">{Number(order.quantity)}</span>
                <Badge variant="outline" className="w-16 text-xs justify-center">
                  {order.orderType}
                </Badge>
              </div>
            ))}
          </div>

          {/* Footer summary — dynamic weight */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">
              Total: {karigarOrders.length} orders | {totalWeight.toFixed(2)}g |
              Qty: {totalQty}
            </span>
          </div>
        </div>
      )}

      {/* Supply dialog for RB orders */}
      <SuppliedQtyDialog
        open={supplyDialogOpen}
        onOpenChange={setSupplyDialogOpen}
        orders={supplyOrders}
      />
    </div>
  );
}

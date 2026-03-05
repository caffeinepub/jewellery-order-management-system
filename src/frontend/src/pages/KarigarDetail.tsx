import { type Order, OrderStatus, OrderType } from "@/backend";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useActor } from "@/hooks/useActor";
import {
  useGenericNameResolver,
  useGetAllDesignMappings,
  useGetAllOrders,
  useMarkOrdersAsReady,
} from "@/hooks/useQueries";
import {
  exportKarigarByDesignGrouped,
  exportToExcel,
} from "@/utils/exportUtils";
import {
  buildDesignMappingsMap,
  resolveKarigar,
} from "@/utils/karigarResolver";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckSquare, FileDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();

  const { data: allOrders = [], isLoading: ordersLoading } = useGetAllOrders();
  const { data: rawMappings = [], isLoading: mappingsLoading } =
    useGetAllDesignMappings();
  const markAsReadyMutation = useMarkOrdersAsReady();
  const { actor } = useActor();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);

  const decodedName = decodeURIComponent(name);
  // Resolve generic name dynamically from master design mappings
  const resolveGenericName = useGenericNameResolver();

  // Build design mappings map for dynamic karigar resolution
  const designMappingsMap = useMemo(
    () => buildDesignMappingsMap(rawMappings),
    [rawMappings],
  );

  // SINGLE SOURCE OF TRUTH: filter orders by dynamically resolved karigar
  // Never use o.karigarName from the stored order record
  const karigarOrders = useMemo(
    () =>
      allOrders.filter(
        (o) =>
          resolveKarigar(o.design, designMappingsMap) === decodedName &&
          o.status === OrderStatus.Pending &&
          Number(o.quantity) > 0,
      ),
    [allOrders, designMappingsMap, decodedName],
  );

  const selectedOrders = useMemo(
    () => karigarOrders.filter((o) => selectedIds.has(o.orderId)),
    [karigarOrders, selectedIds],
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
      (o) => o.orderType !== OrderType.RB,
    );

    if (rbOrders.length > 0) {
      setSupplyOrders(rbOrders);
      setSupplyDialogOpen(true);
    }

    if (nonRbOrders.length > 0) {
      markAsReadyMutation.mutate(
        { orderIds: nonRbOrders.map((o) => o.orderId), updatedBy: "system" },
        {
          onSuccess: () => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              for (const o of nonRbOrders) next.delete(o.orderId);
              return next;
            });
          },
        },
      );
    }
  };

  // Pre-fetch design image URLs for all unique design codes in this karigar's orders.
  // Uses getBytes() first for direct blob URLs; falls back to getDirectURL() if bytes empty.
  const fetchDesignImageUrls = async (
    orders: Order[],
  ): Promise<Map<string, string>> => {
    const urlMap = new Map<string, string>();
    if (!actor) return urlMap;
    const uniqueDesigns = Array.from(new Set(orders.map((o) => o.design)));
    await Promise.all(
      uniqueDesigns.map(async (design) => {
        try {
          const a = actor as any;
          const externalBlob =
            typeof a.getDesignImage === "function"
              ? await a.getDesignImage(design)
              : null;
          if (!externalBlob) return;

          // Try getBytes() first — gives a local blob URL with no CORS issues
          let url: string | null = null;
          try {
            const bytes = await externalBlob.getBytes();
            if (bytes && bytes.length > 0) {
              // Detect mime type from magic bytes
              let mimeType = "image/jpeg";
              if (bytes[0] === 0x89 && bytes[1] === 0x50)
                mimeType = "image/png";
              else if (bytes[0] === 0x47 && bytes[1] === 0x49)
                mimeType = "image/gif";
              else if (bytes[0] === 0x52 && bytes[1] === 0x49)
                mimeType = "image/webp";
              const blob = new Blob([bytes], { type: mimeType });
              url = URL.createObjectURL(blob);
            }
          } catch {
            // getBytes failed — fall through to getDirectURL
          }

          // Fallback: use direct HTTP URL from the storage backend
          if (!url) {
            const directUrl = externalBlob.getDirectURL();
            if (directUrl) url = directUrl;
          }

          if (url) urlMap.set(design, url);
        } catch {
          // skip failed image fetches
        }
      }),
    );
    return urlMap;
  };

  const handleExportJpeg = async () => {
    setIsExportingJpeg(true);
    try {
      const imageUrls = await fetchDesignImageUrls(karigarOrders);
      await exportKarigarByDesignGrouped(
        karigarOrders,
        decodedName,
        `${decodedName}-orders.jpg`,
        "jpeg",
        imageUrls,
      );
    } finally {
      setIsExportingJpeg(false);
    }
  };

  const handleExportPDFAll = async () => {
    const imageUrls = await fetchDesignImageUrls(karigarOrders);
    exportKarigarByDesignGrouped(
      karigarOrders,
      decodedName,
      `${decodedName}-orders-all.pdf`,
      "pdf",
      imageUrls,
    );
  };

  const handleExportPDFSelected = async () => {
    const imageUrls = await fetchDesignImageUrls(selectedOrders);
    exportKarigarByDesignGrouped(
      selectedOrders,
      decodedName,
      `${decodedName}-orders-selected.pdf`,
      "pdf",
      imageUrls,
    );
  };

  const handleExportExcel = async () => {
    await exportToExcel(karigarOrders, `${decodedName}-orders.xlsx`);
  };

  // Dynamic weight: unit_weight × qty
  const totalWeight = karigarOrders.reduce(
    (s, o) => s + o.weight * Number(o.quantity),
    0,
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
    <div className="w-full p-6 space-y-6">
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
          {/* Table header — karigar view: Generic Name, Weight, Qty only */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
            <Checkbox
              checked={
                selectedIds.size === karigarOrders.length &&
                karigarOrders.length > 0
              }
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium text-muted-foreground flex-1">
              Generic Name
            </span>
            <span className="text-sm font-medium text-muted-foreground w-24">
              Weight
            </span>
            <span className="text-sm font-medium text-muted-foreground w-16">
              Qty
            </span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {karigarOrders.map((order) => (
              <div
                key={order.orderId}
                className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => toggleOne(order.orderId)}
                onKeyDown={(e) => e.key === "Enter" && toggleOne(order.orderId)}
              >
                <Checkbox
                  checked={selectedIds.has(order.orderId)}
                  onCheckedChange={() => toggleOne(order.orderId)}
                  onClick={(e) => e.stopPropagation()}
                />
                {/* Generic name resolved dynamically from master design mappings */}
                <span className="flex-1 text-sm text-foreground">
                  {resolveGenericName(order.design) || order.design}
                </span>
                <span className="w-24 text-sm">
                  {(order.weight * Number(order.quantity)).toFixed(2)}g
                </span>
                <span className="w-16 text-sm font-medium">
                  {Number(order.quantity)}
                </span>
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

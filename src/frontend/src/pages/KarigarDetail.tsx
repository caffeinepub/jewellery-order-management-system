import { type Order, OrderStatus, OrderType } from "@/backend";
import DesignImageModal from "@/components/dashboard/DesignImageModal";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
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
import {
  ArrowLeft,
  CheckSquare,
  FileDown,
  Image as ImageIcon,
  Loader2,
  Package,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function KarigarDetail() {
  const { name } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();

  const { data: allOrders = [], isLoading: ordersLoading } = useGetAllOrders();
  const { data: rawMappings = [], isLoading: mappingsLoading } =
    useGetAllDesignMappings();
  const markAsReadyMutation = useMarkOrdersAsReady();
  const { actor } = useActor();
  const { currentUser } = useAuth();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [imageModalDesign, setImageModalDesign] = useState<string | null>(null);

  const decodedName = decodeURIComponent(name);
  // Resolve generic name dynamically from master design mappings
  const resolveGenericName = useGenericNameResolver();

  // Build design mappings map for dynamic karigar resolution
  const designMappingsMap = useMemo(
    () => buildDesignMappingsMap(rawMappings),
    [rawMappings],
  );

  // SINGLE SOURCE OF TRUTH: filter orders by dynamically resolved karigar
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

  // Compute unique generic name tabs from karigarOrders
  const genericNameTabs = useMemo(() => {
    const names = new Set(
      karigarOrders.map((o) => resolveGenericName(o.design) || "Unassigned"),
    );
    return ["All", ...Array.from(names).sort()];
  }, [karigarOrders, resolveGenericName]);

  // Filter by active tab
  const tabFilteredOrders = useMemo(() => {
    if (activeTab === "All") return karigarOrders;
    return karigarOrders.filter(
      (o) => (resolveGenericName(o.design) || "Unassigned") === activeTab,
    );
  }, [karigarOrders, activeTab, resolveGenericName]);

  // Group tabFilteredOrders by design code
  const designGroups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of tabFilteredOrders) {
      if (!map.has(o.design)) map.set(o.design, []);
      map.get(o.design)!.push(o);
    }
    return map;
  }, [tabFilteredOrders]);

  const selectedOrders = useMemo(
    () => tabFilteredOrders.filter((o) => selectedIds.has(o.orderId)),
    [tabFilteredOrders, selectedIds],
  );

  // RB orders currently selected
  const selectedRBOrders = useMemo(
    () =>
      tabFilteredOrders.filter(
        (o) => selectedIds.has(o.orderId) && o.orderType === OrderType.RB,
      ),
    [tabFilteredOrders, selectedIds],
  );

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupAll = (design: string) => {
    const groupOrders = designGroups.get(design) ?? [];
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

  const toggleAll = () => {
    if (selectedIds.size === tabFilteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tabFilteredOrders.map((o) => o.orderId)));
    }
  };

  const handleMarkAsReady = () => {
    const nonRbOrders = selectedOrders.filter(
      (o) => o.orderType !== OrderType.RB,
    );

    if (nonRbOrders.length > 0) {
      markAsReadyMutation.mutate(
        {
          orderIds: nonRbOrders.map((o) => o.orderId),
          updatedBy: currentUser?.name ?? "system",
        },
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

  const handleOpenSupplyDialog = () => {
    if (selectedRBOrders.length === 0) return;
    setSupplyOrders(selectedRBOrders);
    setSupplyDialogOpen(true);
  };

  // Pre-fetch design image URLs for all unique design codes
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

          let url: string | null = null;
          try {
            const bytes = await externalBlob.getBytes();
            if (bytes && bytes.length > 0) {
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
            // fall through
          }

          if (!url) {
            const directUrl = externalBlob.getDirectURL();
            if (directUrl) url = directUrl;
          }

          if (url) urlMap.set(design, url);
        } catch {
          // skip
        }
      }),
    );
    return urlMap;
  };

  // Karigar resolver for exports — resolves dynamically from master design mappings
  const karigarResolverFn = (designCode: string) =>
    resolveKarigar(designCode, designMappingsMap);

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
        karigarResolverFn,
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
      karigarResolverFn,
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
      karigarResolverFn,
    );
  };

  const handleExportExcel = async () => {
    await exportToExcel(
      karigarOrders,
      `${decodedName}-orders.xlsx`,
      karigarResolverFn,
    );
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
    <div className="w-full p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
          data-ocid="karigar.back.button"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-orange-500">{decodedName}</h1>
          <p className="text-muted-foreground text-sm">
            {karigarOrders.length} pending order
            {karigarOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Generic Name Tabs */}
      {genericNameTabs.length > 1 && (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex gap-1 min-w-max border-b border-border pb-0">
            {genericNameTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedIds(new Set());
                }}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-orange-500 text-orange-500"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                data-ocid="karigar.tab"
              >
                {tab}
                {tab !== "All" && (
                  <span className="ml-1.5 text-xs opacity-70">
                    (
                    {
                      karigarOrders.filter(
                        (o) =>
                          (resolveGenericName(o.design) || "Unassigned") ===
                          tab,
                      ).length
                    }
                    )
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 && (
          <>
            {/* Non-RB mark as ready */}
            {selectedOrders.some((o) => o.orderType !== OrderType.RB) && (
              <Button
                size="sm"
                onClick={handleMarkAsReady}
                disabled={markAsReadyMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                data-ocid="karigar.primary_button"
              >
                {markAsReadyMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckSquare className="mr-2 h-4 w-4" />
                )}
                Mark as Ready (
                {
                  selectedOrders.filter((o) => o.orderType !== OrderType.RB)
                    .length
                }
                )
              </Button>
            )}

            {/* RB supply button */}
            {selectedRBOrders.length > 0 && (
              <Button
                size="sm"
                onClick={handleOpenSupplyDialog}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                data-ocid="karigar.secondary_button"
              >
                <Package className="mr-2 h-4 w-4" />
                Supply RB ({selectedRBOrders.length})
              </Button>
            )}
          </>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJpeg}
            disabled={isExportingJpeg}
            data-ocid="karigar.button"
          >
            {isExportingJpeg ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-1 h-4 w-4" />
            )}
            Export JPEG
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDFAll}
            data-ocid="karigar.button"
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF (All)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDFSelected}
            disabled={selectedIds.size === 0}
            data-ocid="karigar.button"
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF (Selected)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            data-ocid="karigar.button"
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Select All row */}
      {tabFilteredOrders.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={
              selectedIds.size === tabFilteredOrders.length &&
              tabFilteredOrders.length > 0
            }
            onCheckedChange={toggleAll}
            id="select-all-karigar"
          />
          <label
            htmlFor="select-all-karigar"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Select all ({tabFilteredOrders.length})
          </label>
        </div>
      )}

      {/* Design groups */}
      {tabFilteredOrders.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="karigar.empty_state"
        >
          No pending orders for {decodedName}
          {activeTab !== "All" ? ` in "${activeTab}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(designGroups.entries()).map(([design, groupOrders]) => {
            const groupQty = groupOrders.reduce(
              (s, o) => s + Number(o.quantity),
              0,
            );
            const groupWeight = groupOrders.reduce(
              (s, o) => s + o.weight * Number(o.quantity),
              0,
            );
            const allGroupSelected = groupOrders.every((o) =>
              selectedIds.has(o.orderId),
            );
            const someGroupSelected = groupOrders.some((o) =>
              selectedIds.has(o.orderId),
            );
            const genericName = resolveGenericName(design);

            return (
              <div
                key={design}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                  <Checkbox
                    checked={allGroupSelected}
                    data-state={
                      someGroupSelected && !allGroupSelected
                        ? "indeterminate"
                        : undefined
                    }
                    onCheckedChange={() => toggleGroupAll(design)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-bold text-orange-500 text-sm">
                    {design}
                  </span>
                  {genericName && (
                    <span className="text-xs text-muted-foreground">
                      {genericName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImageModalDesign(design)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="View design image"
                    data-ocid="karigar.open_modal_button"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Qty: {groupQty}</span>
                    <span>{groupWeight.toFixed(2)}g</span>
                    <span>
                      {groupOrders.length} row
                      {groupOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Column headers */}
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b border-border text-xs font-medium text-muted-foreground">
                  <span className="w-4 shrink-0" />
                  <span className="flex-1">Generic Name</span>
                  <span className="w-20 text-right">Weight</span>
                  <span className="w-12 text-right">Qty</span>
                  <span className="w-16 text-right">Size</span>
                  <span className="w-32">Remarks</span>
                  <span className="w-12 text-center">Type</span>
                </div>

                {/* Order rows */}
                <div className="divide-y divide-border">
                  {groupOrders.map((order) => {
                    const qty = Number(order.quantity);
                    const totalOrderWeight = order.weight * qty;
                    const isRB = order.orderType === OrderType.RB;

                    return (
                      <div
                        key={order.orderId}
                        className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => toggleOne(order.orderId)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && toggleOne(order.orderId)
                        }
                      >
                        <Checkbox
                          checked={selectedIds.has(order.orderId)}
                          onCheckedChange={() => toggleOne(order.orderId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="flex-1 text-sm text-foreground">
                          {resolveGenericName(order.design) || order.design}
                        </span>
                        <span className="w-20 text-right text-sm font-medium">
                          {totalOrderWeight.toFixed(2)}g
                        </span>
                        <span className="w-12 text-right text-sm font-medium">
                          {qty}
                        </span>
                        <span className="w-16 text-right text-sm text-muted-foreground">
                          {order.size || "-"}
                        </span>
                        <span
                          className="w-32 text-sm text-muted-foreground truncate"
                          title={order.remarks || ""}
                        >
                          {order.remarks || "-"}
                        </span>
                        <span className="w-12 flex justify-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isRB
                                ? "border-amber-500/50 text-amber-500"
                                : order.orderType === OrderType.CO
                                  ? "border-blue-500/50 text-blue-500"
                                  : "border-purple-500/50 text-purple-500"
                            }`}
                          >
                            {order.orderType}
                          </Badge>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer summary */}
      {karigarOrders.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          <span>
            Total:{" "}
            <span className="font-semibold text-foreground">
              {karigarOrders.length}
            </span>{" "}
            orders
          </span>
          <span>
            Weight:{" "}
            <span className="font-semibold text-foreground">
              {totalWeight.toFixed(2)}g
            </span>
          </span>
          <span>
            Qty:{" "}
            <span className="font-semibold text-foreground">{totalQty}</span>
          </span>
        </div>
      )}

      {/* Supply dialog for RB orders */}
      <SuppliedQtyDialog
        open={supplyDialogOpen}
        onOpenChange={setSupplyDialogOpen}
        orders={supplyOrders}
      />

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

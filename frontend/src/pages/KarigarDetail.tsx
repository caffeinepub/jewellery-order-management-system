import { useState, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetAllOrders, useGetAllMasterDesignMappings, useGetDesignImage } from "@/hooks/useQueries";
import { Order } from "@/backend";
import SuppliedQtyDialog from "@/components/dashboard/SuppliedQtyDialog";

// Helper to format date
function formatDate(time?: bigint): string {
  if (!time) return "-";
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// HTML-based PDF export that groups orders by design code with images
async function exportKarigarOrdersPDFHTML(
  karigarName: string,
  groupedOrders: { designCode: string; genericName: string; imageUrl?: string; orders: Order[] }[]
): Promise<void> {
  const rows = groupedOrders.map((group) => {
    const totalQty = group.orders.reduce((s, o) => s + Number(o.quantity), 0);
    const totalWeight = group.orders.reduce((s, o) => s + o.weight, 0);

    const orderRows = group.orders
      .map(
        (o, i) => `
      <tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}">
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px">${o.orderNo}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;text-align:center">${o.orderType || "-"}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;text-align:center">${Number(o.quantity)}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;text-align:right">${o.weight.toFixed(3)}g</td>
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;text-align:center">${o.size || "-"}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px">${formatDate(o.orderDate)}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px">${o.remarks || "-"}</td>
      </tr>`
      )
      .join("");

    const imageSection = group.imageUrl
      ? `<img src="${group.imageUrl}" style="max-width:120px;max-height:120px;object-fit:contain;border:1px solid #ddd;border-radius:4px;margin-bottom:8px" />`
      : `<div style="width:80px;height:80px;background:#f0f0f0;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:10px;color:#999;padding:8px;text-align:center">No Image</div>`;

    return `
    <div style="margin-bottom:24px;page-break-inside:avoid">
      <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:8px">
        ${imageSection}
        <div>
          <div style="font-size:14px;font-weight:bold;color:#c07800">${group.designCode}</div>
          ${group.genericName ? `<div style="font-size:11px;color:#555;margin-top:2px">${group.genericName}</div>` : ""}
          <div style="font-size:10px;color:#777;margin-top:4px">${group.orders.length} order(s) | Qty: ${totalQty} | Wt: ${totalWeight.toFixed(3)}g</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#2a2a2a;color:#fff">
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:left">Order No</th>
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:center">Type</th>
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:center">Qty</th>
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:right">Weight</th>
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:center">Size</th>
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:left">Order Date</th>
            <th style="padding:5px 6px;border:1px solid #444;font-size:10px;text-align:left">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows}
        </tbody>
        <tfoot>
          <tr style="background:#fff3cd">
            <td colspan="2" style="padding:4px 6px;border:1px solid #ddd;font-size:10px;font-weight:bold">Total</td>
            <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;font-weight:bold;text-align:center">${totalQty}</td>
            <td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;font-weight:bold;text-align:right">${totalWeight.toFixed(3)}g</td>
            <td colspan="3" style="padding:4px 6px;border:1px solid #ddd;font-size:10px"></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  }).join("");

  const totalOrders = groupedOrders.reduce((s, g) => s + g.orders.length, 0);
  const totalQtyAll = groupedOrders.reduce((s, g) => s + g.orders.reduce((ss, o) => ss + Number(o.quantity), 0), 0);
  const totalWeightAll = groupedOrders.reduce((s, g) => s + g.orders.reduce((ss, o) => ss + o.weight, 0), 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${karigarName}_orders_${new Date().toISOString().split("T")[0]}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
    @media print { body { margin: 10mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div style="margin-bottom:20px;border-bottom:2px solid #c07800;padding-bottom:12px">
    <h1 style="margin:0;font-size:20px;color:#1a1a1a">${karigarName} — Orders Export</h1>
    <div style="font-size:11px;color:#666;margin-top:4px">
      Exported on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} &nbsp;|&nbsp;
      ${groupedOrders.length} design(s) &nbsp;|&nbsp; ${totalOrders} order(s) &nbsp;|&nbsp; Total Qty: ${totalQtyAll} &nbsp;|&nbsp; Total Wt: ${totalWeightAll.toFixed(3)}g
    </div>
  </div>
  ${rows}
  <div class="no-print" style="margin-top:20px;text-align:center">
    <button onclick="window.print()" style="padding:8px 24px;background:#c07800;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => { setTimeout(() => win.print(), 500); };
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Excel export
async function exportToExcel(karigarName: string, orders: Order[]): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX: any = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs" as string);
  const wsData = [
    ["Order No", "Design Code", "Generic Name", "Type", "Qty", "Weight", "Size", "Order Date", "Status", "Remarks"],
    ...orders.map((o) => [
      o.orderNo,
      o.design,
      o.genericName || "-",
      o.orderType,
      Number(o.quantity),
      o.weight,
      o.size,
      formatDate(o.orderDate),
      o.status,
      o.remarks,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, `${karigarName}_orders_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export default function KarigarDetail() {
  const { name: karigarName } = useParams({ from: "/karigar/$name" });
  const navigate = useNavigate();
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyOrders, setSupplyOrders] = useState<Order[]>([]);

  const { data: allOrders = [], isLoading: ordersLoading } = useGetAllOrders();
  const { data: masterDesigns = [] } = useGetAllMasterDesignMappings();

  // Build design mapping lookup
  const designMappingMap = useMemo(() => {
    const map = new Map<string, { genericName: string; karigarName: string }>();
    for (const [code, mapping] of masterDesigns) {
      map.set(code, { genericName: mapping.genericName, karigarName: mapping.karigarName });
    }
    return map;
  }, [masterDesigns]);

  // Enrich orders with latest karigar/generic from master designs
  const enrichedOrders = useMemo(() => {
    return allOrders.map((order) => {
      const mapping = designMappingMap.get(order.design);
      if (mapping) {
        return { ...order, karigarName: mapping.karigarName, genericName: mapping.genericName };
      }
      return order;
    });
  }, [allOrders, designMappingMap]);

  // Filter orders for this karigar (pending only)
  const karigarOrders = useMemo(() => {
    return enrichedOrders.filter(
      (o) => o.karigarName === karigarName && o.status === "Pending"
    );
  }, [enrichedOrders, karigarName]);

  // Group by design code
  const groupedByDesign = useMemo(() => {
    const groups = new Map<string, { designCode: string; genericName: string; orders: Order[] }>();
    for (const order of karigarOrders) {
      const dc = order.design;
      if (!groups.has(dc)) {
        groups.set(dc, { designCode: dc, genericName: order.genericName || "", orders: [] });
      }
      groups.get(dc)!.orders.push(order);
    }
    return Array.from(groups.values()).sort((a, b) => a.designCode.localeCompare(b.designCode));
  }, [karigarOrders]);

  const allOrderIds = useMemo(() => karigarOrders.map((o) => o.orderId), [karigarOrders]);

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === allOrderIds.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allOrderIds));
    }
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleExportPDF = async (ordersToExport: Order[]) => {
    if (ordersToExport.length === 0) return;
    setIsExporting(true);
    try {
      const groupMap = new Map<string, { designCode: string; genericName: string; imageUrl?: string; orders: Order[] }>();
      for (const order of ordersToExport) {
        const dc = order.design;
        if (!groupMap.has(dc)) {
          groupMap.set(dc, { designCode: dc, genericName: order.genericName || "", orders: [] });
        }
        groupMap.get(dc)!.orders.push(order);
      }
      const groups = Array.from(groupMap.values()).sort((a, b) => a.designCode.localeCompare(b.designCode));
      await exportKarigarOrdersPDFHTML(karigarName, groups);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportToExcel(karigarName, karigarOrders);
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleSupply = (orders: Order[]) => {
    setSupplyOrders(orders);
    setSupplyDialogOpen(true);
  };

  const totalQty = karigarOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalWeight = karigarOrders.reduce((s, o) => s + o.weight, 0);
  const selectedOrders = karigarOrders.filter((o) => selectedOrderIds.has(o.orderId));

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{karigarName}</h1>
          <p className="text-sm text-muted-foreground">
            {karigarOrders.length} orders · {totalQty} pcs · {totalWeight.toFixed(3)}g
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportPDF(karigarOrders)}
          disabled={isExporting || karigarOrders.length === 0}
        >
          {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Export PDF (All)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportPDF(selectedOrders)}
          disabled={isExporting || selectedOrderIds.size === 0}
        >
          {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Export PDF (Selected)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExportingExcel || karigarOrders.length === 0}
        >
          {isExportingExcel ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
          Export Excel
        </Button>
        {selectedOrderIds.size > 0 && (
          <Button size="sm" onClick={() => handleSupply(selectedOrders)}>
            Supply Selected ({selectedOrderIds.size})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
          {selectedOrderIds.size === allOrderIds.length && allOrderIds.length > 0 ? "Deselect All" : "Select All"}
        </Button>
      </div>

      {/* Groups */}
      {groupedByDesign.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No pending orders for {karigarName}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDesign.map((group) => (
            <DesignGroup
              key={group.designCode}
              group={group}
              selectedOrderIds={selectedOrderIds}
              onToggleOrder={toggleOrder}
              onSupply={handleSupply}
            />
          ))}
        </div>
      )}

      {/* Supply dialog */}
      <SuppliedQtyDialog
        open={supplyDialogOpen}
        onOpenChange={setSupplyDialogOpen}
        rbOrders={supplyOrders}
      />
    </div>
  );
}

interface DesignGroupProps {
  group: { designCode: string; genericName: string; orders: Order[] };
  selectedOrderIds: Set<string>;
  onToggleOrder: (id: string) => void;
  onSupply: (orders: Order[]) => void;
}

function DesignGroup({ group, selectedOrderIds, onToggleOrder, onSupply }: DesignGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const { data: designData } = useGetDesignImage(group.designCode);
  const imageUrl = designData?.blob ? designData.blob.getDirectURL() : undefined;

  const totalQty = group.orders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalWeight = group.orders.reduce((s, o) => s + o.weight, 0);
  const selectedCount = group.orders.filter((o) => selectedOrderIds.has(o.orderId)).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Group header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={group.designCode}
            className="w-12 h-12 object-contain rounded border border-border bg-white shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-primary text-sm">{group.designCode}</div>
          {group.genericName && (
            <div className="text-xs text-muted-foreground truncate">{group.genericName}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {group.orders.length} orders · {totalQty} pcs · {totalWeight.toFixed(3)}g
            {selectedCount > 0 && (
              <span className="ml-2 text-primary font-medium">({selectedCount} selected)</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSupply(group.orders);
          }}
        >
          Supply
        </Button>
      </div>

      {/* Orders table */}
      {expanded && (
        <div className="border-t border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2 text-left w-8"></th>
                <th className="p-2 text-left">Order No</th>
                <th className="p-2 text-center">Type</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Weight</th>
                <th className="p-2 text-center">Size</th>
                <th className="p-2 text-left">Order Date</th>
                <th className="p-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {group.orders
                .slice()
                .sort((a, b) => {
                  const da = a.orderDate ? Number(a.orderDate) : 0;
                  const db = b.orderDate ? Number(b.orderDate) : 0;
                  return da - db;
                })
                .map((order, i) => (
                  <tr
                    key={order.orderId}
                    className={`border-t border-border/50 ${selectedOrderIds.has(order.orderId) ? "bg-primary/10" : i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.orderId)}
                        onChange={() => onToggleOrder(order.orderId)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2 font-medium">{order.orderNo}</td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className="text-xs px-1 py-0">{order.orderType}</Badge>
                    </td>
                    <td className="p-2 text-center">{Number(order.quantity)}</td>
                    <td className="p-2 text-right">{order.weight.toFixed(3)}g</td>
                    <td className="p-2 text-center">{order.size || "-"}</td>
                    <td className="p-2">{formatDate(order.orderDate)}</td>
                    <td className="p-2 text-muted-foreground">{order.remarks || "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

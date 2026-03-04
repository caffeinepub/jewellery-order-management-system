import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { type MasterDataRow, OrderType } from "../backend";
import type { Order } from "../backend";
import {
  usePersistMasterDataRows,
  useReconcileMasterFile,
} from "../hooks/useQueries";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  orderNo: string;
  designCode: string;
  karigar: string;
  weight: number;
  quantity: number;
  orderType: OrderType; // REQ-4: preserve parsed type
  orderDate?: bigint;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

function parseOrderType(raw: unknown): OrderType {
  const val = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (val === "RB") return OrderType.RB;
  if (val === "SO") return OrderType.SO;
  return OrderType.CO;
}

function parseExcelDateSerial(XLSX: any, raw: unknown): bigint | undefined {
  if (!raw) return undefined;
  if (typeof raw === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(raw);
      if (date) {
        const ms = Date.UTC(date.y, date.m - 1, date.d);
        return BigInt(ms) * BigInt(1_000_000);
      }
    } catch {
      // ignore
    }
  }
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    if (!Number.isNaN(ms)) return BigInt(ms) * BigInt(1_000_000);
  }
  return undefined;
}

async function parseMasterFile(file: File): Promise<ParsedRow[]> {
  // Load XLSX from CDN — not in package.json
  const XLSX: any = await import(
    "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs" as any
  );

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headerRow = rows[0] as unknown[];
  const headers = headerRow.map(normalizeHeader);

  const colIdx = (names: string[]): number => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h === name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const orderNoIdx = colIdx([
    "orderno",
    "order no",
    "ordernumber",
    "order number",
  ]);
  const designIdx = colIdx(["designcode", "design code", "design"]);
  const karigarIdx = colIdx(["karigar", "karigarname", "karigar name"]);
  const weightIdx = colIdx(["weight", "wt"]);
  const qtyIdx = colIdx(["quantity", "qty"]);
  // REQ-4: scan for order type column
  const orderTypeIdx = colIdx([
    "ordertype",
    "order type",
    "ordert",
    "order t",
    "type",
  ]);
  const orderDateIdx = colIdx(["orderdate", "order date", "date"]);

  const parsed: ParsedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;

    const orderNo = String(row[orderNoIdx] ?? "").trim();
    const designCode = String(row[designIdx] ?? "")
      .trim()
      .toUpperCase();
    if (!orderNo || !designCode) continue;

    const karigar = karigarIdx >= 0 ? String(row[karigarIdx] ?? "").trim() : "";
    const weight =
      weightIdx >= 0
        ? Number.parseFloat(String(row[weightIdx] ?? "0")) || 0
        : 0;
    const quantity =
      qtyIdx >= 0 ? Number.parseInt(String(row[qtyIdx] ?? "1"), 10) || 1 : 1;

    // REQ-4: parse order type from column if present, else default CO
    const orderType: OrderType =
      orderTypeIdx >= 0 ? parseOrderType(row[orderTypeIdx]) : OrderType.CO;

    const orderDate =
      orderDateIdx >= 0
        ? parseExcelDateSerial(XLSX, row[orderDateIdx])
        : undefined;

    parsed.push({
      orderNo,
      designCode,
      karigar,
      weight,
      quantity,
      orderType,
      orderDate,
    });
  }

  return parsed;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Reconciliation: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{
    newLines: MasterDataRow[];
    missingInMaster: Order[];
    totalUploadedRows: bigint;
    alreadyExistingRows: bigint;
    newLinesCount: bigint;
    missingInMasterCount: bigint;
  } | null>(null);
  const [selectedNewLines, setSelectedNewLines] = useState<Set<string>>(
    new Set(),
  );

  const reconcileMutation = useReconcileMasterFile();
  const persistMutation = usePersistMasterDataRows();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setReconcileResult(null);
    setSelectedNewLines(new Set());
    setIsParsing(true);

    try {
      const rows = await parseMasterFile(file);
      setParsedRows(rows);
      toast.success(`Parsed ${rows.length} rows from ${file.name}`);
    } catch {
      toast.error("Failed to parse Excel file");
      setParsedRows([]);
    } finally {
      setIsParsing(false);
      // Reset so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReconcile = async () => {
    if (parsedRows.length === 0) return;

    // REQ-4: ensure each MasterDataRow carries the correctly parsed orderType
    const masterDataRows: MasterDataRow[] = parsedRows.map((row) => ({
      orderNo: row.orderNo,
      designCode: row.designCode,
      karigar: row.karigar,
      weight: row.weight,
      quantity: BigInt(row.quantity),
      orderType: row.orderType, // preserve parsed type — NOT hardcoded CO
      orderDate: row.orderDate,
    }));

    try {
      const result = await reconcileMutation.mutateAsync(masterDataRows);
      setReconcileResult(result);
      // Pre-select all new lines
      setSelectedNewLines(
        new Set(result.newLines.map((r) => `${r.orderNo}_${r.designCode}`)),
      );
    } catch {
      toast.error("Reconciliation failed");
    }
  };

  const handleAddToTotalOrders = async () => {
    if (!reconcileResult) return;

    const rowsToAdd = reconcileResult.newLines.filter((r) =>
      selectedNewLines.has(`${r.orderNo}_${r.designCode}`),
    );

    if (rowsToAdd.length === 0) {
      toast.warning("No rows selected");
      return;
    }

    try {
      const response = await persistMutation.mutateAsync(rowsToAdd);
      toast.success(
        `Added ${response.persisted.length} orders to Total Orders`,
      );
      setReconcileResult(null);
      setParsedRows([]);
      setFileName("");
      setSelectedNewLines(new Set());
    } catch {
      toast.error("Failed to add orders");
    }
  };

  const toggleNewLine = (key: string) => {
    setSelectedNewLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllNewLines = (checked: boolean) => {
    if (!reconcileResult) return;
    if (checked) {
      setSelectedNewLines(
        new Set(
          reconcileResult.newLines.map((r) => `${r.orderNo}_${r.designCode}`),
        ),
      );
    } else {
      setSelectedNewLines(new Set());
    }
  };

  function orderTypeBadgeColor(type: OrderType): string {
    if (type === OrderType.RB) return "bg-blue-600 text-white";
    if (type === OrderType.SO) return "bg-purple-600 text-white";
    return "bg-green-600 text-white";
  }

  const allNewLinesSelected =
    reconcileResult !== null &&
    reconcileResult.newLines.length > 0 &&
    reconcileResult.newLines.every((r) =>
      selectedNewLines.has(`${r.orderNo}_${r.designCode}`),
    );

  const isLoading = isParsing || reconcileMutation.isPending;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-foreground">Reconciliation</h1>

      {/* Upload area */}
      <Card>
        <CardContent className="pt-4">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: file upload trigger div */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-border hover:border-gold/50"
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-gold" />
                <span className="text-sm font-medium text-foreground">
                  {fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({parsedRows.length} rows)
                </span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Click to upload master Excel file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  .xlsx or .xls
                </p>
              </>
            )}
            {isParsing && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
                <span className="text-sm text-muted-foreground">
                  Parsing...
                </span>
              </div>
            )}
          </div>

          {parsedRows.length > 0 && (
            <Button
              className="mt-3 w-full bg-gold hover:bg-gold-hover text-white"
              onClick={handleReconcile}
              disabled={reconcileMutation.isPending}
            >
              {reconcileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Reconciling...
                </>
              ) : (
                "Reconcile with Total Orders"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {reconcileResult && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total Uploaded",
                value: String(reconcileResult.totalUploadedRows),
              },
              {
                label: "Already Existing",
                value: String(reconcileResult.alreadyExistingRows),
              },
              {
                label: "New Lines",
                value: String(reconcileResult.newLinesCount),
                highlight: true,
              },
              {
                label: "Missing in Master",
                value: String(reconcileResult.missingInMasterCount),
                warn: true,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-3 pb-3 text-center">
                  <div
                    className={`text-2xl font-bold ${
                      item.highlight
                        ? "text-gold"
                        : item.warn
                          ? "text-destructive"
                          : "text-foreground"
                    }`}
                  >
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* New Lines table */}
          {reconcileResult.newLines.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-gold" />
                    <span className="font-semibold text-foreground">
                      New Lines ({reconcileResult.newLines.length})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddToTotalOrders}
                    disabled={
                      selectedNewLines.size === 0 || persistMutation.isPending
                    }
                    className="bg-gold hover:bg-gold-hover text-white"
                  >
                    {persistMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      `Add Selected (${selectedNewLines.size})`
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allNewLinesSelected}
                            onCheckedChange={(v) => toggleAllNewLines(!!v)}
                          />
                        </TableHead>
                        <TableHead>Order No</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Karigar</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconcileResult.newLines.map((row) => {
                        const key = `${row.orderNo}_${row.designCode}`;
                        const isSelected = selectedNewLines.has(key);
                        return (
                          <TableRow
                            key={key}
                            className={`cursor-pointer ${isSelected ? "bg-gold/10" : ""}`}
                            onClick={() => toggleNewLine(key)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleNewLine(key)}
                              />
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {row.orderNo}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.designCode}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded ${orderTypeBadgeColor(
                                  row.orderType,
                                )}`}
                              >
                                {row.orderType}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.karigar}
                            </TableCell>
                            <TableCell className="text-sm">
                              {String(row.quantity)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.weight.toFixed(2)}g
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missing in Master table */}
          {reconcileResult.missingInMaster.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="font-semibold text-foreground">
                    Missing in Master ({reconcileResult.missingInMaster.length})
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order No</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconcileResult.missingInMaster.map((order) => (
                        <TableRow key={order.orderId}>
                          <TableCell className="text-sm font-medium">
                            {order.orderNo}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.design}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${orderTypeBadgeColor(
                                order.orderType,
                              )}`}
                            >
                              {order.orderType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {String(order.quantity)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.weight.toFixed(2)}g
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Reconciliation;

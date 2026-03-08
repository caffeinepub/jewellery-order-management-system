import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { OrderType } from "../backend";
import { useActor } from "../hooks/useActor";
import { parseOrdersExcel } from "../utils/excelParser";

interface UploadResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

interface BackfillResult {
  updated: number;
  skipped: number;
}

export default function IngestOrders() {
  const { actor } = useActor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backfillFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backfillFile, setBackfillFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [hasOrderDateColumn, setHasOrderDateColumn] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadResult(null);
    setParseError(null);
    setHasOrderDateColumn(false);

    if (file) {
      try {
        const parsed = await parseOrdersExcel(file);
        setHasOrderDateColumn(parsed.some((o) => o.orderDate !== null));
      } catch {
        // ignore peek errors
      }
    }
  }

  async function handleBackfillFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0] ?? null;
    setBackfillFile(file);
    setBackfillResult(null);
    setBackfillError(null);
  }

  async function handleUpload() {
    if (!actor || !selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);
    setParseError(null);

    try {
      const parsedOrders = await parseOrdersExcel(selectedFile);

      if (parsedOrders.length === 0) {
        setParseError("No valid orders found in the file.");
        setIsUploading(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < parsedOrders.length; i++) {
        const order = parsedOrders[i];
        const rowNum = i + 2;

        try {
          if (!order.orderNo || order.orderNo.trim() === "") {
            throw new Error("Missing order number");
          }
          if (!order.design || order.design.trim() === "") {
            throw new Error("Missing design code");
          }

          const orderType =
            order.orderType === OrderType.RB
              ? OrderType.RB
              : order.orderType === OrderType.SO
                ? OrderType.SO
                : OrderType.CO;

          await actor.createOrderWithDate(
            order.orderNo.trim(),
            orderType,
            (order.product ?? "").trim(),
            order.design.trim(),
            order.weight ?? 0,
            order.size ?? 0,
            BigInt(order.quantity),
            (order.remarks ?? "").trim(),
            null,
            null,
            order.orderDate ?? null,
          );

          success++;
        } catch (err: unknown) {
          failed++;
          let message = "Unknown error";
          if (err instanceof Error) {
            const raw = err.message;
            if (raw.includes('"reject_message"')) {
              const match = raw.match(/"reject_message"\s*:\s*"([^"]+)"/);
              message = match ? match[1] : raw.slice(0, 300);
            } else if (raw.includes("Canister") && raw.length > 300) {
              const lines = raw.split("\n");
              message = lines[0]?.slice(0, 300) ?? raw.slice(0, 300);
            } else {
              message = raw.slice(0, 300);
            }
          }
          errors.push({ row: rowNum, message });
        }
      }

      setUploadResult({ success, failed, errors });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to parse file";
      setParseError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleBackfillDates() {
    if (!actor || !backfillFile) return;

    setIsBackfilling(true);
    setBackfillResult(null);
    setBackfillError(null);

    try {
      const parsedOrders = await parseOrdersExcel(backfillFile);

      // Only keep orders that have a valid date
      const ordersWithDates = parsedOrders.filter((o) => o.orderDate !== null);

      if (ordersWithDates.length === 0) {
        setBackfillError(
          "No orders with a valid Order Date column found in this file. Make sure the Excel has an 'Order Date' column in DD/MM/YYYY format.",
        );
        setIsBackfilling(false);
        return;
      }

      // Build (orderNo, dateNanoseconds) pairs — deduplicated by orderNo
      const seen = new Set<string>();
      const entries: Array<[string, bigint]> = [];
      for (const o of ordersWithDates) {
        if (!seen.has(o.orderNo) && o.orderDate !== null) {
          seen.add(o.orderNo);
          entries.push([o.orderNo, o.orderDate]);
        }
      }

      const updated = await actor.backfillOrderDates(entries);
      const updatedCount = Number(updated);
      // skipped = orders in Excel with no matching order number in the system
      const skippedCount =
        entries.length - Math.min(updatedCount, entries.length);

      setBackfillResult({
        updated: updatedCount,
        skipped: skippedCount,
      });

      if (updatedCount > 0) {
        toast.success(
          `${updatedCount} order record${updatedCount !== 1 ? "s" : ""} updated with correct order dates.`,
        );
      } else {
        toast.info(
          "No matching orders found in the system for the uploaded file.",
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to backfill dates";
      setBackfillError(message);
    } finally {
      setIsBackfilling(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ingest Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload an Excel file to import orders into the system.
        </p>
      </div>

      {/* Upload new orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Orders Excel</CardTitle>
          <CardDescription>
            Select an Excel file containing order data. The file will be parsed
            and validated before upload.{" "}
            {hasOrderDateColumn && (
              <>
                Include an <strong>Order Date</strong> column to enable Ageing
                Stock tracking.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose File
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedFile ? selectedFile.name : "No file chosen"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || !actor}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    {uploadResult.success}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Successful
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive shrink-0" />
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    {uploadResult.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {uploadResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  Upload Errors
                </CardTitle>
                <CardDescription>
                  The following orders failed to upload:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {uploadResult.errors.map((err) => (
                  <div
                    key={`err-${err.row}`}
                    className="flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-sm text-foreground">
                        Row {err.row}:
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 break-all">
                        {err.message}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Backfill Dates section */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            Fix Missing Order Dates
          </CardTitle>
          <CardDescription>
            Upload the full orders Excel here to fix overdue day calculations.
            This will update the order date for every matching order in the
            system — including correcting previously wrong dates — without
            creating duplicates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => backfillFileInputRef.current?.click()}
              disabled={isBackfilling}
            >
              Choose File
            </Button>
            <span className="text-sm text-muted-foreground">
              {backfillFile ? backfillFile.name : "No file chosen"}
            </span>
            <input
              ref={backfillFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleBackfillFileChange}
            />
          </div>

          <Button
            variant="outline"
            className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
            onClick={handleBackfillDates}
            disabled={!backfillFile || isBackfilling || !actor}
          >
            {isBackfilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Backfilling Dates...
              </>
            ) : (
              <>
                <CalendarClock className="h-4 w-4 mr-2" />
                Backfill Dates Only
              </>
            )}
          </Button>

          {backfillError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{backfillError}</AlertDescription>
            </Alert>
          )}

          {backfillResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-400">
                {backfillResult.updated} order record
                {backfillResult.updated !== 1 ? "s" : ""} updated with dates
              </p>
              {backfillResult.skipped > 0 && (
                <p className="text-xs text-muted-foreground">
                  {backfillResult.skipped} order
                  {backfillResult.skipped !== 1 ? "s" : ""} in Excel had no
                  match in the system (skipped)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

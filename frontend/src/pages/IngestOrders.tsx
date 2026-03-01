import { useState, useRef } from "react";
import { useActor } from "../hooks/useActor";
import { OrderType } from "../backend";
import { parseOrdersExcel } from "../utils/excelParser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export default function IngestOrders() {
  const { actor } = useActor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasOrderDateColumn, setHasOrderDateColumn] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadResult(null);
    setParseError(null);
    setHasOrderDateColumn(false);

    if (file) {
      try {
        // Quick peek to detect Order Date column
        const parsed = await parseOrdersExcel(file);
        setHasOrderDateColumn(parsed.some((o) => o.orderDate !== null));
      } catch {
        // ignore peek errors — full validation happens on upload
      }
    }
  }

  async function handleUpload() {
    if (!actor || !selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);
    setParseError(null);

    try {
      // Parse the file — parseOrdersExcel accepts a File directly
      const parsedOrders = await parseOrdersExcel(selectedFile);

      if (parsedOrders.length === 0) {
        setParseError("No valid orders found in the file.");
        setIsUploading(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: { row: number; message: string }[] = [];

      // Process orders sequentially to avoid instruction limit issues on the canister
      for (let i = 0; i < parsedOrders.length; i++) {
        const order = parsedOrders[i];
        const rowNum = i + 2; // Excel rows start at 2 (row 1 is header)

        try {
          if (!order.orderNo || order.orderNo.trim() === "") {
            throw new Error("Missing order number");
          }
          if (!order.design || order.design.trim() === "") {
            throw new Error("Missing design code");
          }

          const uniqueSuffix = `${Date.now()}-${i}-${Math.random()
            .toString(36)
            .slice(2, 7)}`;
          const orderId = `${order.orderNo.trim()}-${order.design.trim()}-${uniqueSuffix}`;

          const orderType =
            order.orderType === OrderType.RB
              ? OrderType.RB
              : order.orderType === OrderType.SO
              ? OrderType.SO
              : OrderType.CO;

          // orderDate is already bigint | null from parseOrdersExcel
          const orderDateNano: bigint | null = order.orderDate ?? null;

          await actor.saveOrder(
            order.orderNo.trim(),
            orderType,
            (order.product ?? "").trim(),
            order.design.trim(),
            order.weight ?? 0,
            order.size ?? 0,
            BigInt(order.quantity), // quantity is number from parseOrdersExcel, convert to bigint
            (order.remarks ?? "").trim(),
            orderId,
            orderDateNano
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ingest Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload an Excel file to import orders into the system.
        </p>
      </div>

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
                  <div className="text-sm text-muted-foreground">Successful</div>
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
                {uploadResult.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-2">
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
    </div>
  );
}

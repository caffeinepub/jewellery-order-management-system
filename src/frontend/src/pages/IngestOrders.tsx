import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle } from "lucide-react";
import { useActor } from "@/hooks/useActor";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderType } from "@/backend";
import { normalizeDesignCode } from "@/utils/excelParser";

interface ParsedOrder {
  orderNo: string;
  orderType: OrderType;
  product: string;
  design: string;
  weight: number;
  size: number;
  quantity: bigint;
  remarks: string;
  orderId: string;
}

export default function IngestOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [failedOrders, setFailedOrders] = useState<
    Array<{ row: number; error: string; data: any }>
  >([]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !actor) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });
    setFailedOrders([]);

    try {
      const XLSX = await import(
        "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs" as any
      );

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast.error("Excel file is empty");
        setIsProcessing(false);
        return;
      }

      setProgress({ current: 0, total: jsonData.length });

      const orders: ParsedOrder[] = [];
      const failed: Array<{ row: number; error: string; data: any }> = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const rowNumber = i + 2;

        try {
          const orderNo = String(row["Order No"] || "").trim();
          const orderTypeRaw = String(row["Type"] || "").trim().toUpperCase();
          const product = String(row["Product"] || "").trim();
          const designRaw = String(row["Design"] || "").trim();
          const weightRaw = row["Wt"];
          const sizeRaw = row["Size"];
          const quantityRaw = row["Qty"];
          const remarks = String(row["Remarks"] || "").trim();

          if (!orderNo) {
            failed.push({
              row: rowNumber,
              error: "Missing Order No",
              data: row,
            });
            continue;
          }

          if (!orderTypeRaw || (orderTypeRaw !== "CO" && orderTypeRaw !== "RB")) {
            failed.push({
              row: rowNumber,
              error: `Invalid Type: ${orderTypeRaw}. Must be CO or RB`,
              data: row,
            });
            continue;
          }

          if (!product) {
            failed.push({
              row: rowNumber,
              error: "Missing Product",
              data: row,
            });
            continue;
          }

          if (!designRaw) {
            failed.push({
              row: rowNumber,
              error: "Missing Design",
              data: row,
            });
            continue;
          }

          const weight = parseFloat(String(weightRaw));
          const size = parseFloat(String(sizeRaw));
          const quantity = parseInt(String(quantityRaw), 10);

          if (isNaN(weight) || weight <= 0) {
            failed.push({
              row: rowNumber,
              error: `Invalid Weight: ${weightRaw}`,
              data: row,
            });
            continue;
          }

          if (isNaN(size) || size <= 0) {
            failed.push({
              row: rowNumber,
              error: `Invalid Size: ${sizeRaw}`,
              data: row,
            });
            continue;
          }

          if (isNaN(quantity) || quantity <= 0) {
            failed.push({
              row: rowNumber,
              error: `Invalid Quantity: ${quantityRaw}`,
              data: row,
            });
            continue;
          }

          const design = normalizeDesignCode(designRaw);
          const orderType: OrderType = orderTypeRaw as OrderType;
          const orderId = `${orderNo}-${Date.now()}-${i}`;

          orders.push({
            orderNo,
            orderType,
            product,
            design,
            weight,
            size,
            quantity: BigInt(quantity),
            remarks,
            orderId,
          });
        } catch (error) {
          failed.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : "Unknown error",
            data: row,
          });
        }
      }

      setFailedOrders(failed);

      if (orders.length === 0) {
        toast.error("No valid orders to save");
        setIsProcessing(false);
        return;
      }

      const BATCH_SIZE = 200;
      const batches: ParsedOrder[][] = [];
      for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        batches.push(orders.slice(i, i + BATCH_SIZE));
      }

      let savedCount = 0;
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        await Promise.all(
          batch.map((order) =>
            actor.saveOrder(
              order.orderNo,
              order.orderType,
              order.product,
              order.design,
              order.weight,
              order.size,
              order.quantity,
              order.remarks,
              order.orderId
            )
          )
        );

        savedCount += batch.length;
        setProgress({ current: savedCount, total: orders.length });
      }

      await queryClient.invalidateQueries({ queryKey: ["orders"] });

      if (failed.length > 0) {
        toast.warning(
          `Ingested ${savedCount} orders. ${failed.length} rows failed validation.`
        );
      } else {
        toast.success(`Successfully ingested ${savedCount} orders!`);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process file"
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Ingest Orders</h1>

      <Alert className="mb-6 border-amber-500 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> Please upload the Master Design Excel file
          first from the Master Designs page to ensure proper design code
          mapping.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload Orders Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload an Excel file with columns: Order No, Type, Product,
              Design, Wt, Size, Qty, Remarks
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild disabled={isProcessing}>
                <span className="cursor-pointer">
                  {isProcessing ? "Processing..." : "Choose File"}
                </span>
              </Button>
            </label>
          </div>

          {isProcessing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing orders...</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {failedOrders.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{failedOrders.length} rows failed validation:</strong>
                <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto">
                  {failedOrders.slice(0, 10).map((fail, idx) => (
                    <li key={idx}>
                      Row {fail.row}: {fail.error}
                    </li>
                  ))}
                  {failedOrders.length > 10 && (
                    <li className="font-medium">
                      ... and {failedOrders.length - 10} more
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

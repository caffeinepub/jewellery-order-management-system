import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { parseOrdersExcel } from '../utils/excelParser';
import { useSaveOrder, useGetAllOrders } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import type { OrderType } from '../backend';

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

interface UploadResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const BATCH_SIZE = 50;

export default function IngestOrders() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);

  const { actor } = useActor();
  const saveOrderMutation = useSaveOrder();
  const { refetch: refetchOrders } = useGetAllOrders();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setParsedOrders([]);

    try {
      const orders = await parseOrdersExcel(selectedFile);
      setParsedOrders(orders);
      toast.success(`Parsed ${orders.length} orders from Excel`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Failed to parse Excel file. Please check the format.');
      setFile(null);
    }
  };

  const processBatch = async (orders: ParsedOrder[], startIdx: number): Promise<UploadResult> => {
    const batchResult: UploadResult = { success: 0, failed: 0, errors: [] };
    const endIdx = Math.min(startIdx + BATCH_SIZE, orders.length);
    const batch = orders.slice(startIdx, endIdx);

    for (let i = 0; i < batch.length; i++) {
      const order = batch[i];
      const currentRow = startIdx + i + 2; // +2 for header row and 0-based index

      try {
        if (!actor) throw new Error('Actor not initialized');

        // Call backend to save order - backend will handle mapping lookup
        // If mapping doesn't exist, backend will trap with error
        await actor.saveOrder(
          order.orderNo,
          order.orderType,
          order.product,
          order.design,
          order.weight,
          order.size,
          order.quantity,
          order.remarks,
          order.orderId
        );

        batchResult.success++;
      } catch (error: any) {
        batchResult.failed++;
        const errorMsg = error?.message || 'Unknown error';
        batchResult.errors.push({
          row: currentRow,
          error: errorMsg.includes('Design mapping not found')
            ? `Design code "${order.design}" not found in Master Design Excel. Please upload Master Design Excel first.`
            : errorMsg,
        });
      }

      // Update progress
      const totalProcessed = startIdx + i + 1;
      setProgress(Math.round((totalProcessed / orders.length) * 100));
    }

    return batchResult;
  };

  const handleUpload = async () => {
    if (!file || parsedOrders.length === 0) {
      toast.error('Please select a valid Excel file first');
      return;
    }

    if (!actor) {
      toast.error('Backend not initialized. Please wait and try again.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const finalResult: UploadResult = { success: 0, failed: 0, errors: [] };

    try {
      // Process orders in batches
      for (let i = 0; i < parsedOrders.length; i += BATCH_SIZE) {
        const batchResult = await processBatch(parsedOrders, i);
        finalResult.success += batchResult.success;
        finalResult.failed += batchResult.failed;
        finalResult.errors.push(...batchResult.errors);

        // Small delay between batches to prevent overwhelming the backend
        if (i + BATCH_SIZE < parsedOrders.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      setResult(finalResult);

      if (finalResult.success > 0) {
        await refetchOrders();
        toast.success(`Successfully uploaded ${finalResult.success} orders`);
      }

      if (finalResult.failed > 0) {
        toast.error(`Failed to upload ${finalResult.failed} orders. Check details below.`);
      }

      // Clear file input
      setFile(null);
      setParsedOrders([]);
    } catch (error) {
      console.error('Error during upload:', error);
      toast.error('An unexpected error occurred during upload');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ingest Orders</h1>
        <p className="text-muted-foreground">Upload Excel file to import orders into the system</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Before uploading orders, make sure you have uploaded the Master Design Excel
          with all design code mappings. Orders with unmapped design codes will fail to upload.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload Orders Excel</CardTitle>
          <CardDescription>
            Select an Excel file containing order data. The file will be parsed and validated before upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button onClick={handleUpload} disabled={!file || isProcessing || parsedOrders.length === 0}>
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Upload'}
            </Button>
          </div>

          {parsedOrders.length > 0 && !isProcessing && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Ready to upload: {parsedOrders.length} orders parsed</p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing orders...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{result.success}</p>
                        <p className="text-sm text-muted-foreground">Successful</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold">{result.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {result.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upload Errors</CardTitle>
                    <CardDescription>The following orders failed to upload:</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {result.errors.map((error, idx) => (
                        <Alert key={idx} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Row {error.row}:</strong> {error.error}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

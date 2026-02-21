import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import { parseExcelFile } from '@/utils/excelParser';
import { useIngestOrdersBatch } from '@/hooks/useQueries';
import { toast } from 'sonner';
import { OrderType } from '@/backend';

interface ParsedOrder {
  orderNo: string;
  orderType: OrderType;
  product: string;
  design: string;
  weight: number;
  size: number;
  quantity: number;
  remarks: string;
}

interface ParseError {
  row: number;
  field: string;
  message: string;
}

export default function IngestOrders() {
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const ingestOrders = useIngestOrdersBatch();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrors([]);
    setUploadProgress(0);
    
    try {
      const result = await parseExcelFile(file);
      setParsedOrders(result.data);
      setErrors(result.errors);
      
      if (result.errors.length > 0) {
        toast.warning(`Parsed ${result.data.length} orders with ${result.errors.length} errors`);
      } else {
        toast.success(`Parsed ${result.data.length} orders from Excel`);
      }
    } catch (error) {
      toast.error('Failed to parse Excel file');
      console.error(error);
      setErrors([{ row: 0, field: 'File', message: 'Failed to read or parse the Excel file' }]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (parsedOrders.length === 0) {
      toast.error('No orders to submit');
      return;
    }

    try {
      setUploadProgress(0);
      await ingestOrders.mutateAsync({
        orders: parsedOrders,
        onProgress: (progress) => setUploadProgress(progress),
      });
      const count = parsedOrders.length;
      setParsedOrders([]);
      setErrors([]);
      setUploadProgress(0);
      toast.success(`Successfully ingested ${count} orders`);
    } catch (error) {
      toast.error('Failed to ingest orders');
      setUploadProgress(0);
    }
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className="container px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Ingest Orders</h1>
        <p className="text-muted-foreground mt-1">
          Upload daily Excel files to import orders into the system
        </p>
      </div>

      <Card className="mb-6 border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upload Excel File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="excel-file" className="text-sm font-medium">
                Select Excel File
              </Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading || ingestOrders.isPending}
                  className="flex-1"
                />
                <Button disabled={isUploading || ingestOrders.isPending} variant="outline">
                  {isUploading ? (
                    'Parsing...'
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-dashed p-8 text-center bg-muted/30">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Expected columns: Order No, Order Type, Product, Design, Weight, Size, Quantity,
                Remarks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>Parsing Errors ({errors.length})</span>
            <Button variant="ghost" size="sm" onClick={clearErrors}>
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-[200px] overflow-y-auto space-y-1">
              {errors.map((error, idx) => (
                <div key={idx} className="text-sm">
                  <strong>Row {error.row}:</strong> {error.field} - {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {parsedOrders.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium">
              Preview ({parsedOrders.length} orders)
            </CardTitle>
            <Button onClick={handleSubmit} disabled={ingestOrders.isPending}>
              {ingestOrders.isPending ? 'Submitting...' : 'Submit Orders'}
            </Button>
          </CardHeader>
          <CardContent>
            {ingestOrders.isPending && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading orders...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Design</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedOrders.map((order, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{order.orderNo}</TableCell>
                      <TableCell>{order.orderType}</TableCell>
                      <TableCell>{order.product}</TableCell>
                      <TableCell>{order.design}</TableCell>
                      <TableCell>{order.weight}g</TableCell>
                      <TableCell>{order.size}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{order.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

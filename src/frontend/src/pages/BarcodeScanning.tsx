import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQRScanner } from '@/qr-code/useQRScanner';
import { useBulkUpdateStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { toast } from 'sonner';
import { Camera, CameraOff, Trash2, Scan } from 'lucide-react';

export default function BarcodeScanning() {
  const [scannedOrders, setScannedOrders] = useState<string[]>([]);
  const [hardwareScanBuffer, setHardwareScanBuffer] = useState('');
  const [scanMode, setScanMode] = useState<'hardware' | 'camera'>('hardware');
  const lastKeypressTime = useRef<number>(0);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    qrResults,
    isScanning,
    isActive,
    isSupported,
    error,
    isLoading,
    canStartScanning,
    startScanning,
    stopScanning,
    switchCamera,
    clearResults,
    videoRef,
    canvasRef,
  } = useQRScanner({
    facingMode: 'environment',
    scanInterval: 100,
    maxResults: 50,
  });

  const bulkUpdateMutation = useBulkUpdateStatus();

  // Extract order ID from barcode data
  const extractOrderId = (barcodeData: string): string | null => {
    // The barcode format from the image is: 13O7BB26O3955-O5O
    // This appears to be the order ID/barcode number
    // We'll extract any alphanumeric string that looks like an order ID
    
    // Try to match the pattern from the image: digits/letters with dashes
    const match = barcodeData.match(/[A-Z0-9]+[-]?[A-Z0-9]+/i);
    if (match) {
      return match[0];
    }
    
    // Fallback: return the whole string if it's alphanumeric
    if (/^[A-Z0-9-]+$/i.test(barcodeData.trim())) {
      return barcodeData.trim();
    }
    
    return null;
  };

  // Process hardware scan
  const processHardwareScan = (barcode: string) => {
    const orderId = extractOrderId(barcode);
    
    if (!orderId) {
      toast.error('Invalid barcode format');
      return;
    }
    
    if (!scannedOrders.includes(orderId)) {
      setScannedOrders((prev) => [orderId, ...prev]);
      toast.success(`Scanned: ${orderId}`);
    } else {
      toast.info(`Already scanned: ${orderId}`);
    }
  };

  // Hardware barcode scanner detection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeypressTime.current;

      if (e.key === 'Enter') {
        if (hardwareScanBuffer.trim().length > 0) {
          processHardwareScan(hardwareScanBuffer.trim());
          setHardwareScanBuffer('');
        }
        e.preventDefault();
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff < 100) {
          setHardwareScanBuffer((prev) => prev + e.key);
          lastKeypressTime.current = currentTime;

          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
          }

          scanTimeoutRef.current = setTimeout(() => {
            const fullBarcode = hardwareScanBuffer + e.key;
            if (fullBarcode.length > 0) {
              processHardwareScan(fullBarcode.trim());
              setHardwareScanBuffer('');
            }
          }, 150);

          e.preventDefault();
        } else {
          setHardwareScanBuffer(e.key);
          lastKeypressTime.current = currentTime;
        }
      }
    };

    if (scanMode === 'hardware') {
      window.addEventListener('keypress', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [scanMode, hardwareScanBuffer, scannedOrders]);

  // Process QR camera results
  useEffect(() => {
    if (qrResults.length > 0 && scanMode === 'camera') {
      const latestResult = qrResults[0];
      const orderId = extractOrderId(latestResult.data);
      
      if (!orderId) {
        toast.error('Invalid barcode format');
        return;
      }
      
      if (!scannedOrders.includes(orderId)) {
        setScannedOrders((prev) => [orderId, ...prev]);
        toast.success(`Scanned: ${orderId}`);
      }
    }
  }, [qrResults, scanMode]);

  const handleClearScanned = () => {
    setScannedOrders([]);
    clearResults();
    toast.info('Cleared all scanned orders');
  };

  const handleMarkAsReady = async () => {
    if (scannedOrders.length === 0) {
      toast.error('No orders scanned');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderIds: scannedOrders,
        newStatus: OrderStatus.Ready,
      });
      toast.success(`${scannedOrders.length} order(s) marked as Ready`);
      setScannedOrders([]);
      clearResults();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (
    <div className="container px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Barcode Scanning</h1>
        <p className="text-muted-foreground mt-1">
          Scan order barcodes to update status
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Scan Mode</CardTitle>
              <CardDescription>Choose your scanning method</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant={scanMode === 'hardware' ? 'default' : 'outline'}
                  onClick={() => {
                    setScanMode('hardware');
                    if (isActive) stopScanning();
                  }}
                  className="flex-1"
                >
                  <Scan className="mr-2 h-4 w-4" />
                  Hardware Scanner
                </Button>
                <Button
                  variant={scanMode === 'camera' ? 'default' : 'outline'}
                  onClick={() => setScanMode('camera')}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
              </div>

              {scanMode === 'hardware' && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Hardware Scanner Active</strong>
                    <br />
                    Use your USB or Bluetooth barcode scanner. Scans will be detected automatically.
                  </p>
                  {hardwareScanBuffer && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Buffer: {hardwareScanBuffer}
                    </div>
                  )}
                </div>
              )}

              {scanMode === 'camera' && (
                <div className="space-y-3">
                  {isSupported === false && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                      Camera not supported on this device
                    </div>
                  )}

                  {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                      <strong>Error:</strong> {error.message}
                      {error.type === 'permission' && (
                        <p className="mt-2">Please allow camera access in your browser settings.</p>
                      )}
                    </div>
                  )}

                  <div className="relative w-full bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', minHeight: '300px' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      style={{ display: isActive ? 'block' : 'none' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {!isActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                        <Camera className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                      </div>
                    )}
                    {isScanning && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Scanning...
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={startScanning}
                      disabled={!canStartScanning || isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        'Initializing...'
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={stopScanning}
                      disabled={isLoading || !isActive}
                      variant="outline"
                      className="flex-1"
                    >
                      <CameraOff className="mr-2 h-4 w-4" />
                      Stop Camera
                    </Button>
                    {isMobile && (
                      <Button
                        onClick={switchCamera}
                        disabled={isLoading || !isActive}
                        variant="outline"
                        size="icon"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      <strong>Tip:</strong> Position the barcode within the camera view. The scanner will automatically detect and read barcodes.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">
                  Scanned Orders ({scannedOrders.length})
                </CardTitle>
                <CardDescription>Orders ready to be marked as Ready</CardDescription>
              </div>
              {scannedOrders.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearScanned}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scannedOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Scan className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No orders scanned yet</p>
                  <p className="text-sm mt-1">
                    {scanMode === 'hardware'
                      ? 'Use your barcode scanner to scan order IDs'
                      : 'Start the camera and scan barcodes'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {scannedOrders.map((orderId, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-mono text-sm">{orderId}</span>
                        <Badge variant="secondary">Scanned</Badge>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleMarkAsReady}
                    disabled={bulkUpdateMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {bulkUpdateMutation.isPending
                      ? 'Updating...'
                      : `Mark ${scannedOrders.length} Order(s) as Ready`}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

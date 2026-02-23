import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQRScanner } from '@/qr-code/useQRScanner';
import { useBatchUpdateOrderStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { toast } from 'sonner';
import { Camera, CameraOff, Trash2, Scan, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BarcodeScanning() {
  const [scannedOrders, setScannedOrders] = useState<string[]>([]);
  const [hardwareScanBuffer, setHardwareScanBuffer] = useState('');
  const [scanMode, setScanMode] = useState<'hardware' | 'camera'>('hardware');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const lastKeypressTime = useRef<number>(0);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedCodesRef = useRef<Set<string>>(new Set());

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
    jsQRLoaded,
  } = useQRScanner({
    facingMode: 'environment',
    scanInterval: 100, // Balanced scan interval for better detection
    maxResults: 100,
  });

  const batchUpdateMutation = useBatchUpdateOrderStatus();

  // Extract order ID from barcode data
  const extractOrderId = (barcodeData: string): string | null => {
    // Clean the barcode data
    const cleaned = barcodeData.trim();
    
    // The barcode format from the image is: 1307RB2603966-050
    // Pattern: digits/letters with optional dashes
    const match = cleaned.match(/[A-Z0-9]+[-]?[A-Z0-9]+/i);
    if (match) {
      return match[0];
    }
    
    // Fallback: return the whole string if it's alphanumeric with dashes
    if (/^[A-Z0-9-]+$/i.test(cleaned)) {
      return cleaned;
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
      setLastScannedCode(orderId);
      setShowSuccessFeedback(true);
      setTimeout(() => setShowSuccessFeedback(false), 1500);
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

  // Process QR/Barcode camera results with debouncing
  useEffect(() => {
    if (qrResults.length > 0 && scanMode === 'camera' && isActive) {
      const latestResult = qrResults[0];
      const orderId = extractOrderId(latestResult.data);
      
      if (!orderId) {
        return;
      }
      
      // Prevent duplicate processing within 2 seconds
      const codeKey = `${orderId}-${Math.floor(latestResult.timestamp / 2000)}`;
      if (processedCodesRef.current.has(codeKey)) {
        return;
      }
      
      processedCodesRef.current.add(codeKey);
      
      // Clean up old entries (keep only last 50)
      if (processedCodesRef.current.size > 50) {
        const entries = Array.from(processedCodesRef.current);
        processedCodesRef.current = new Set(entries.slice(-50));
      }
      
      if (!scannedOrders.includes(orderId)) {
        setScannedOrders((prev) => [orderId, ...prev]);
        setLastScannedCode(orderId);
        setShowSuccessFeedback(true);
        setTimeout(() => setShowSuccessFeedback(false), 1500);
        toast.success(`Scanned: ${orderId}`);
      }
    }
  }, [qrResults, scanMode, isActive, scannedOrders]);

  const handleClearScanned = () => {
    setScannedOrders([]);
    clearResults();
    setLastScannedCode(null);
    processedCodesRef.current.clear();
    toast.info('Cleared all scanned orders');
  };

  const handleMarkAsReady = async () => {
    if (scannedOrders.length === 0) {
      toast.error('No orders scanned');
      return;
    }

    try {
      await batchUpdateMutation.mutateAsync({
        orderIds: scannedOrders,
        newStatus: OrderStatus.Ready,
      });
      toast.success(`${scannedOrders.length} order(s) marked as Ready`);
      setScannedOrders([]);
      clearResults();
      setLastScannedCode(null);
      processedCodesRef.current.clear();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleStartCamera = async () => {
    const success = await startScanning();
    if (success) {
      processedCodesRef.current.clear();
      toast.success('Camera started - position barcode in the gold frame');
    }
  };

  const handleStopCamera = async () => {
    await stopScanning();
    processedCodesRef.current.clear();
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
                    if (isActive) handleStopCamera();
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
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      Camera not supported on this device
                    </div>
                  )}

                  {!jsQRLoaded && isSupported !== false && (
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading barcode scanner library...</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      <strong>Error:</strong> {error.message}
                      {error.type === 'permission' && (
                        <p className="mt-2">Please allow camera access in your browser settings.</p>
                      )}
                    </div>
                  )}

                  <div 
                    className="relative w-full bg-muted rounded-lg overflow-hidden transition-all duration-300"
                    style={{ 
                      aspectRatio: '4/3', 
                      minHeight: '300px',
                      borderWidth: '4px',
                      borderStyle: 'solid',
                      borderColor: showSuccessFeedback ? 'rgb(34, 197, 94)' : 'transparent'
                    }}
                  >
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
                    
                    {isActive && (
                      <>
                        {/* Scanning frame overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-3/4 h-1/2 border-2 border-gold rounded-lg">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-gold rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-gold rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-gold rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-gold rounded-br-lg"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <p className="text-xs text-white bg-black/50 px-3 py-1 rounded-full">
                                Position barcode here
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status indicators */}
                        {isScanning && !showSuccessFeedback && (
                          <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            Scanning...
                          </div>
                        )}
                        
                        {showSuccessFeedback && (
                          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg animate-in fade-in zoom-in duration-300">
                            <CheckCircle2 className="w-4 h-4" />
                            Detected!
                          </div>
                        )}

                        {lastScannedCode && showSuccessFeedback && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {lastScannedCode}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleStartCamera}
                      disabled={!canStartScanning || isLoading || !jsQRLoaded}
                      className="flex-1"
                    >
                      {isLoading ? (
                        'Initializing...'
                      ) : !jsQRLoaded ? (
                        'Loading...'
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleStopCamera}
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
                      <strong>Tip:</strong> Position the barcode within the gold frame. The scanner will automatically detect and read barcodes. Hold steady for 1-2 seconds for best results.
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
                    disabled={batchUpdateMutation.isPending}
                    className="w-full bg-gold hover:bg-gold-hover"
                  >
                    {batchUpdateMutation.isPending
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

import { useState, useEffect } from 'react';
import { useGetOrdersByStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Printer, Play, Globe, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import WebviewModal from '@/components/tagprinting/WebviewModal';

const MPN_SYSTEM_URL = 'https://mpn.malabargroup.com/';

export default function TagPrinting() {
  const { data: readyOrders = [], isLoading } = useGetOrdersByStatus(OrderStatus.Ready);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState('');
  const [showWebview, setShowWebview] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if session is active (simplified - in production, this would check actual session)
  useEffect(() => {
    const savedLoginStatus = localStorage.getItem('tagPrintingLoggedIn');
    if (savedLoginStatus === 'true') setIsLoggedIn(true);
  }, []);

  const handleOpenMPNSystem = () => {
    setShowWebview(true);
  };

  const handleWebviewClose = () => {
    setShowWebview(false);
    // Assume user has logged in after opening the webview
    setIsLoggedIn(true);
    localStorage.setItem('tagPrintingLoggedIn', 'true');
    toast.success('MPN system session active');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('tagPrintingLoggedIn');
    toast.info('Logged out from tag printing system');
  };

  const handleStartAction = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to MPN system first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const totalOrders = readyOrders.length;
      
      for (let i = 0; i < totalOrders; i++) {
        const order = readyOrders[i];
        setCurrentBatch(`Processing ${order.orderNo}...`);
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const newProgress = Math.floor(((i + 1) / totalOrders) * 100);
        setProgress(newProgress);
      }

      toast.success(`Processed ${totalOrders} orders for tag printing`);
      setCurrentBatch('');
    } catch (error) {
      toast.error('Failed to process orders');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="container px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Tag Printing</h1>
        <p className="text-muted-foreground mt-1">
          Print tags for ready orders via MPN system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Globe className="h-5 w-5" />
              MPN System Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Access the MPN tag printing system. Login is required before starting the action.
              </p>
              
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <div className="flex-1">
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-xs text-muted-foreground">
                    {isLoggedIn ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Logged In
                      </span>
                    ) : (
                      <span className="text-amber-600">Not Logged In</span>
                    )}
                  </div>
                </div>
                {isLoggedIn && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                )}
              </div>
            </div>

            <Button
              onClick={handleOpenMPNSystem}
              className="w-full"
              size="lg"
            >
              <Globe className="mr-2 h-4 w-4" />
              Open MPN System
            </Button>

            <p className="text-xs text-muted-foreground">
              The MPN system will open in an in-app browser. Complete your login there.
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Tag Printing Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ready Orders</span>
                <span className="font-semibold">{readyOrders.length}</span>
              </div>
              
              {isProcessing && (
                <>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{currentBatch}</p>
                </>
              )}
            </div>

            <Button
              onClick={handleStartAction}
              disabled={!isLoggedIn || isProcessing || readyOrders.length === 0}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Action
                </>
              )}
            </Button>

            {!isLoggedIn && (
              <p className="text-xs text-amber-600">
                ⚠️ Please login to MPN system first
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <WebviewModal
        url={MPN_SYSTEM_URL}
        open={showWebview}
        onClose={handleWebviewClose}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useGetOrdersByStatus } from '@/hooks/useQueries';
import { OrderStatus } from '@/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Printer, Play, Globe, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TagPrinting() {
  const { data: readyOrders = [], isLoading } = useGetOrdersByStatus(OrderStatus.Ready);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState('');
  const [tagPrintingUrl, setTagPrintingUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  // Check if session is active (simplified - in production, this would check actual session)
  useEffect(() => {
    const savedUrl = localStorage.getItem('tagPrintingUrl');
    const savedLoginStatus = localStorage.getItem('tagPrintingLoggedIn');
    if (savedUrl) setTagPrintingUrl(savedUrl);
    if (savedLoginStatus === 'true') setIsLoggedIn(true);
  }, []);

  const handleUrlChange = (url: string) => {
    setTagPrintingUrl(url);
    localStorage.setItem('tagPrintingUrl', url);
  };

  const handleLoginComplete = () => {
    setIsLoggedIn(true);
    localStorage.setItem('tagPrintingLoggedIn', 'true');
    toast.success('Login session detected');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('tagPrintingLoggedIn');
    toast.info('Logged out from tag printing system');
  };

  const handleStartAction = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to the tag printing system first');
      return;
    }

    if (readyOrders.length === 0) {
      toast.error('No ready orders to process');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Group orders by design
    const ordersByDesign = readyOrders.reduce((acc, order) => {
      if (!acc[order.design]) {
        acc[order.design] = [];
      }
      acc[order.design].push(order);
      return acc;
    }, {} as Record<string, typeof readyOrders>);

    const designs = Object.keys(ordersByDesign);
    let processedCount = 0;
    const totalOrders = readyOrders.length;

    for (const design of designs) {
      setCurrentBatch(`Processing design: ${design}`);
      const orders = ordersByDesign[design];

      for (const order of orders) {
        // Simulate processing each order
        await new Promise((resolve) => setTimeout(resolve, 500));
        processedCount++;
        setProgress((processedCount / totalOrders) * 100);
      }
    }

    setIsProcessing(false);
    setCurrentBatch('');
    toast.success(`Processed ${totalOrders} orders across ${designs.length} design batches`);
  };

  return (
    <div className="container px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Tag Printing</h1>
        <p className="text-muted-foreground mt-1">
          Process ready orders for tag printing in batches by design
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Ready Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-2">
                <div className="text-3xl font-semibold">{readyOrders.length}</div>
                <p className="text-sm text-muted-foreground">Orders ready for tag printing</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isProcessing ? (
                <>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">{currentBatch}</p>
                  <p className="text-sm font-medium">{Math.round(progress)}% Complete</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isLoggedIn ? 'Ready to process orders' : 'Please login to tag printing system'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Globe className="h-5 w-5 text-gold" />
            Tag Printing System Login
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-url">Tag Printing Website URL</Label>
            <Input
              id="tag-url"
              type="url"
              placeholder="https://your-tag-printing-system.com"
              value={tagPrintingUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowBrowser(!showBrowser)}
              variant="outline"
              disabled={!tagPrintingUrl || isProcessing}
            >
              <Globe className="mr-2 h-4 w-4" />
              {showBrowser ? 'Hide Browser' : 'Open Browser'}
            </Button>

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Logged In</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleLoginComplete}
                variant="outline"
                size="sm"
                disabled={!showBrowser}
              >
                Mark as Logged In
              </Button>
            )}
          </div>

          {showBrowser && tagPrintingUrl && (
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Embedded Browser</span>
                <span className="text-xs text-muted-foreground">
                  Login manually in the browser below
                </span>
              </div>
              <iframe
                src={tagPrintingUrl}
                className="w-full h-[500px] bg-white"
                title="Tag Printing System"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
              <div className="bg-muted px-4 py-2 border-t text-xs text-muted-foreground">
                Note: Due to browser security, some sites may not load in iframe. Session persistence depends on the external site's configuration.
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              onClick={handleStartAction}
              disabled={isProcessing || readyOrders.length === 0 || !isLoggedIn}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                'Processing...'
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start Action
                </>
              )}
            </Button>
            {!isLoggedIn && (
              <p className="text-sm text-muted-foreground mt-2">
                Please login to the tag printing system to enable this button
              </p>
            )}
            {readyOrders.length === 0 && isLoggedIn && (
              <p className="text-sm text-muted-foreground mt-2">No ready orders available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {readyOrders.length > 0 && (
        <Card className="mt-6 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Order Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {readyOrders.slice(0, 10).map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{order.orderNo}</p>
                      <p className="text-xs text-muted-foreground">Design: {order.design}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{order.orderId}</span>
                </div>
              ))}
              {readyOrders.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  And {readyOrders.length - 10} more orders...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

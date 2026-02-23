import { useMemo, useState } from "react";
import { useGetReadyOrders } from "@/hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function TagPrinting() {
  const { data: readyOrders = [], isLoading } = useGetReadyOrders();

  // Group orders by design code
  const groupedByDesign = useMemo(() => {
    const groups: Record<string, string[]> = {};
    
    readyOrders.forEach((order) => {
      if (!groups[order.design]) {
        groups[order.design] = [];
      }
      groups[order.design].push(order.orderNo);
    });

    return groups;
  }, [readyOrders]);

  const handleCopyOrderNumbers = async (orderNumbers: string[]) => {
    try {
      const text = orderNumbers.join(',');
      await navigator.clipboard.writeText(text);
      toast.success("Order numbers copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
      console.error("Copy error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading ready orders...</div>
        </div>
      </div>
    );
  }

  const designCodes = Object.keys(groupedByDesign).sort();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Tag Printing</h1>
        <p className="text-muted-foreground mt-2">
          Ready orders grouped by design code
        </p>
      </div>

      {designCodes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No ready orders found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {designCodes.map((designCode) => {
            const orderNumbers = groupedByDesign[designCode];
            return (
              <Card key={designCode} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gold">
                    {designCode}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {orderNumbers.length} order{orderNumbers.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Order Numbers:</p>
                    <div className="bg-muted rounded-md p-3 max-h-32 overflow-y-auto">
                      <p className="text-sm font-mono break-all">
                        {orderNumbers.join(', ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCopyOrderNumbers(orderNumbers)}
                    className="w-full bg-gold hover:bg-gold-hover"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy for MPN
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

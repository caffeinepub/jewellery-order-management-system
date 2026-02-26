import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import TotalOrdersTab from "../components/dashboard/TotalOrdersTab";
import ReadyTab from "../components/dashboard/ReadyTab";
import HallmarkTab from "../components/dashboard/HallmarkTab";
import CustomerOrdersTab from "../components/dashboard/CustomerOrdersTab";
import KarigarsTab from "../components/dashboard/KarigarsTab";
import { useGetAllOrders } from "../hooks/useQueries";
import { normalizeOrders } from "../utils/orderNormalizer";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("total");
  const queryClient = useQueryClient();

  const {
    data: rawOrders,
    isLoading,
    isError,
    error,
  } = useGetAllOrders();

  // Normalize orders to ensure quantity is always a proper bigint
  const orders = rawOrders ? normalizeOrders(rawOrders) : [];

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-playfair text-foreground">
          Dashboard
        </h1>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load orders</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {error instanceof Error ? error.message : "An error occurred while loading orders."}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <SummaryCards
        orders={orders}
        activeTab={activeTab}
        isLoading={isLoading}
        isError={isError}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="total">Total Orders</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          <TabsTrigger value="customer">Customer Orders</TabsTrigger>
          <TabsTrigger value="karigars">Karigars</TabsTrigger>
        </TabsList>

        <TabsContent value="total" className="mt-4">
          <TotalOrdersTab orders={orders} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="ready" className="mt-4">
          <ReadyTab orders={orders} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="hallmark" className="mt-4">
          <HallmarkTab orders={orders} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="customer" className="mt-4">
          <CustomerOrdersTab orders={orders} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="karigars" className="mt-4">
          <KarigarsTab orders={orders} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

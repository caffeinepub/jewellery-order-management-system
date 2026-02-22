import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TotalOrdersTab from "@/components/dashboard/TotalOrdersTab";
import ReadyTab from "@/components/dashboard/ReadyTab";
import HallmarkTab from "@/components/dashboard/HallmarkTab";
import CustomerOrdersTab from "@/components/dashboard/CustomerOrdersTab";
import KarigarsTab from "@/components/dashboard/KarigarsTab";
import UnmappedSection from "@/components/dashboard/UnmappedSection";
import { Order } from "@/backend";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("total");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const handleFilteredOrdersChange = useCallback((orders: Order[], isLoading: boolean) => {
    setFilteredOrders(orders);
    setIsLoadingOrders(isLoading);
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your jewellery orders and production workflow
        </p>
      </div>

      <UnmappedSection />

      <SummaryCards orders={filteredOrders} isLoading={isLoadingOrders} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="total">Total Orders</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          <TabsTrigger value="customer">Customer Orders</TabsTrigger>
          <TabsTrigger value="karigars">Karigars</TabsTrigger>
        </TabsList>

        <TabsContent value="total" className="space-y-4">
          <TotalOrdersTab onFilteredOrdersChange={handleFilteredOrdersChange} />
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          <ReadyTab onFilteredOrdersChange={handleFilteredOrdersChange} />
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4">
          <HallmarkTab onFilteredOrdersChange={handleFilteredOrdersChange} />
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <CustomerOrdersTab onFilteredOrdersChange={handleFilteredOrdersChange} />
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4">
          <KarigarsTab onFilteredOrdersChange={handleFilteredOrdersChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

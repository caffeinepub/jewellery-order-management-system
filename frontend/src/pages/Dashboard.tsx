import { useState } from "react";
import { useGetAllOrders } from "../hooks/useQueries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCards from "../components/dashboard/SummaryCards";
import TotalOrdersTab from "../components/dashboard/TotalOrdersTab";
import ReadyTab from "../components/dashboard/ReadyTab";
import HallmarkTab from "../components/dashboard/HallmarkTab";
import CustomerOrdersTab from "../components/dashboard/CustomerOrdersTab";
import KarigarsTab from "../components/dashboard/KarigarsTab";
import UnmappedSection from "../components/dashboard/UnmappedSection";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("total");
  const { data: orders = [], isLoading, isError } = useGetAllOrders();

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 max-w-full overflow-x-hidden">
      {/* Summary Cards */}
      <SummaryCards
        orders={orders}
        isLoading={isLoading}
        isError={isError}
        activeTab={activeTab}
      />

      {/* Unmapped Section — fetches its own data internally */}
      <UnmappedSection />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex overflow-x-auto h-auto p-1 gap-0.5 bg-muted rounded-lg">
          <TabsTrigger
            value="total"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Total Orders
          </TabsTrigger>
          <TabsTrigger
            value="ready"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Ready
          </TabsTrigger>
          <TabsTrigger
            value="hallmark"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Hallmark
          </TabsTrigger>
          <TabsTrigger
            value="customer"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Customer Orders
          </TabsTrigger>
          <TabsTrigger
            value="karigars"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Karigars
          </TabsTrigger>
        </TabsList>

        <TabsContent value="total" className="mt-3">
          <TotalOrdersTab orders={orders} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="ready" className="mt-3">
          <ReadyTab orders={orders} isLoading={isLoading} isError={isError} />
        </TabsContent>

        <TabsContent value="hallmark" className="mt-3">
          <HallmarkTab />
        </TabsContent>

        <TabsContent value="customer" className="mt-3">
          <CustomerOrdersTab />
        </TabsContent>

        <TabsContent value="karigars" className="mt-3">
          <KarigarsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

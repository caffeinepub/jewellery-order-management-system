import CustomerOrdersTab from "@/components/dashboard/CustomerOrdersTab";
import HallmarkTab from "@/components/dashboard/HallmarkTab";
import KarigarsTab from "@/components/dashboard/KarigarsTab";
import ReadyTab from "@/components/dashboard/ReadyTab";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TotalOrdersTab from "@/components/dashboard/TotalOrdersTab";
import UnmappedSection from "@/components/dashboard/UnmappedSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAllOrders } from "@/hooks/useQueries";
import { useState } from "react";

type TabKey = "total" | "ready" | "hallmark" | "customer" | "karigars";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("total");
  const { data: allOrders = [], isLoading, isError } = useGetAllOrders();

  return (
    <div className="p-3 md:p-6 space-y-3 md:space-y-5 min-w-0">
      <SummaryCards activeTab={activeTab} />

      <UnmappedSection />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabKey)}
        className="w-full"
      >
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full">
            <TabsTrigger
              value="total"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
            >
              Total Orders
            </TabsTrigger>
            <TabsTrigger
              value="ready"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
            >
              Ready
            </TabsTrigger>
            <TabsTrigger
              value="hallmark"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
            >
              Hallmark
            </TabsTrigger>
            <TabsTrigger
              value="customer"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
            >
              Customer Orders
            </TabsTrigger>
            <TabsTrigger
              value="karigars"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
            >
              Karigars
            </TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 mt-4">
            {["s1", "s2", "s3", "s4", "s5"].map((sk) => (
              <div
                key={sk}
                className="h-14 w-full rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="total" className="mt-3">
              <TotalOrdersTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value="ready" className="mt-3">
              <ReadyTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value="hallmark" className="mt-3">
              <HallmarkTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value="customer" className="mt-3">
              <CustomerOrdersTab />
            </TabsContent>
            <TabsContent value="karigars" className="mt-3">
              <KarigarsTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

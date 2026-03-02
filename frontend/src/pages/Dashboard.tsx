import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TotalOrdersTab } from "../components/dashboard/TotalOrdersTab";
import ReadyTab from "../components/dashboard/ReadyTab";
import { HallmarkTab } from "../components/dashboard/HallmarkTab";
import CustomerOrdersTab from "../components/dashboard/CustomerOrdersTab";
import KarigarsTab from "../components/dashboard/KarigarsTab";
import SummaryCards from "../components/dashboard/SummaryCards";
import UnmappedSection from "../components/dashboard/UnmappedSection";
import { useGetAllOrders } from "../hooks/useQueries";

const TAB_VALUES = {
  TOTAL: "total-orders",
  READY: "ready",
  HALLMARK: "hallmark",
  CUSTOMER: "customer-orders",
  KARIGARS: "karigars",
} as const;

function tabValueToSummaryKey(tabValue: string): string {
  switch (tabValue) {
    case TAB_VALUES.READY:
      return "ready";
    case TAB_VALUES.HALLMARK:
      return "hallmark";
    case TAB_VALUES.CUSTOMER:
      return "customer";
    case TAB_VALUES.KARIGARS:
      return "karigars";
    default:
      return "total";
  }
}

const Dashboard: React.FC = () => {
  const { data: allOrders = [], isLoading, isError } = useGetAllOrders();
  const [activeTab, setActiveTab] = useState<string>(TAB_VALUES.TOTAL);

  return (
    <div className="flex flex-col gap-4 p-4">
      <SummaryCards
        orders={allOrders}
        isError={isError}
        activeTab={tabValueToSummaryKey(activeTab)}
      />

      <UnmappedSection />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue={TAB_VALUES.TOTAL}
      >
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value={TAB_VALUES.TOTAL}>Total Orders</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.READY}>Ready</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.HALLMARK}>Hallmark</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.CUSTOMER}>Customer Orders</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.KARIGARS}>Karigars</TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value={TAB_VALUES.TOTAL}>
              <TotalOrdersTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value={TAB_VALUES.READY}>
              <ReadyTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value={TAB_VALUES.HALLMARK}>
              <HallmarkTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value={TAB_VALUES.CUSTOMER}>
              <CustomerOrdersTab />
            </TabsContent>
            <TabsContent value={TAB_VALUES.KARIGARS}>
              <KarigarsTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;

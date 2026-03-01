import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import TotalOrdersTab from "../components/dashboard/TotalOrdersTab";
import ReadyTab from "../components/dashboard/ReadyTab";
import HallmarkTab from "../components/dashboard/HallmarkTab";
import CustomerOrdersTab from "../components/dashboard/CustomerOrdersTab";
import KarigarsTab from "../components/dashboard/KarigarsTab";
import SummaryCards from "../components/dashboard/SummaryCards";
import UnmappedSection from "../components/dashboard/UnmappedSection";
import { useGetAllOrders } from "../hooks/useQueries";

const Dashboard: React.FC = () => {
  const { data: allOrders = [], isLoading, isError } = useGetAllOrders();

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Summary cards */}
      <SummaryCards orders={allOrders} isError={isError} />

      {/* Unmapped section */}
      <UnmappedSection />

      {/* Tabs */}
      <Tabs defaultValue="total-orders">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value="total-orders">Total Orders</TabsTrigger>
            <TabsTrigger value="ready">Ready</TabsTrigger>
            <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
            <TabsTrigger value="customer-orders">Customer Orders</TabsTrigger>
            <TabsTrigger value="karigars">Karigars</TabsTrigger>
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
            <TabsContent value="total-orders">
              <TotalOrdersTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value="ready">
              <ReadyTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value="hallmark">
              <HallmarkTab orders={allOrders} isError={isError} />
            </TabsContent>
            <TabsContent value="customer-orders">
              <CustomerOrdersTab />
            </TabsContent>
            <TabsContent value="karigars">
              <KarigarsTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;

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
import { AppRole } from "../backend";
import { useAuth } from "../context/AuthContext";

type TabKey = "total" | "ready" | "hallmark" | "customer" | "karigars";

// Today's ISO date string
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === AppRole.Staff;
  const isKarigar = currentUser?.role === AppRole.Karigar;

  // Karigar users only ever see the Karigars tab
  const defaultTab: TabKey = isKarigar ? "karigars" : "total";
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const { data: allOrders = [], isLoading, isError } = useGetAllOrders();

  // Hallmark date range — shared between HallmarkTab and SummaryCards
  const [hallmarkFromDate, setHallmarkFromDate] = useState<string>(todayStr());
  const [hallmarkToDate, setHallmarkToDate] = useState<string>(todayStr());

  // Karigar: render only the Karigars tab view
  if (isKarigar) {
    return (
      <div className="p-3 md:p-6 space-y-3 md:space-y-5 min-w-0 w-full overflow-x-hidden">
        <KarigarsTab />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-3 md:space-y-5 min-w-0 w-full overflow-x-hidden">
      {/* Summary cards and unmapped section: Admin only, not Staff or Karigar */}
      {!isStaff && (
        <SummaryCards
          activeTab={activeTab}
          hallmarkFromDate={hallmarkFromDate}
          hallmarkToDate={hallmarkToDate}
        />
      )}
      {!isStaff && <UnmappedSection />}

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
            {/* Karigars tab: Admin only, hidden for Staff */}
            {!isStaff && (
              <TabsTrigger
                value="karigars"
                className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
              >
                Karigars
              </TabsTrigger>
            )}
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
              <HallmarkTab
                orders={allOrders}
                isError={isError}
                hallmarkFromDate={hallmarkFromDate}
                hallmarkToDate={hallmarkToDate}
                onHallmarkFromDateChange={setHallmarkFromDate}
                onHallmarkToDateChange={setHallmarkToDate}
              />
            </TabsContent>
            <TabsContent value="customer" className="mt-3">
              <CustomerOrdersTab />
            </TabsContent>
            {!isStaff && (
              <TabsContent value="karigars" className="mt-3">
                <KarigarsTab />
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}

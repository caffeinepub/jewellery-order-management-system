import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TotalOrdersTab from "@/components/dashboard/TotalOrdersTab";
import ReadyTab from "@/components/dashboard/ReadyTab";
import HallmarkTab from "@/components/dashboard/HallmarkTab";
import CustomerOrdersTab from "@/components/dashboard/CustomerOrdersTab";
import KarigarsTab from "@/components/dashboard/KarigarsTab";
import UnmappedSection from "@/components/dashboard/UnmappedSection";

type ActiveTab = "total" | "ready" | "hallmark" | "customer" | "karigars";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("total");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your jewellery orders and production workflow
        </p>
      </div>

      <UnmappedSection />

      <SummaryCards activeTab={activeTab} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="total">Total Orders</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          <TabsTrigger value="customer">Customer Orders</TabsTrigger>
          <TabsTrigger value="karigars">Karigars</TabsTrigger>
        </TabsList>

        <TabsContent value="total" className="space-y-4">
          <TotalOrdersTab />
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          <ReadyTab />
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4">
          <HallmarkTab />
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <CustomerOrdersTab />
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4">
          <KarigarsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

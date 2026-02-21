import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SummaryCards from '@/components/dashboard/SummaryCards';
import ReadyTab from '@/components/dashboard/ReadyTab';
import HallmarkTab from '@/components/dashboard/HallmarkTab';
import TotalOrdersTab from '@/components/dashboard/TotalOrdersTab';
import CustomerOrdersTab from '@/components/dashboard/CustomerOrdersTab';
import KarigarsTab from '@/components/dashboard/KarigarsTab';

export default function Dashboard() {
  return (
    <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-full overflow-x-hidden">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your jewellery orders efficiently
        </p>
      </div>

      <SummaryCards />

      <div className="mt-6 sm:mt-8">
        <Tabs defaultValue="total-orders" className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-full sm:w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="total-orders" className="flex-1 sm:flex-none">Total Orders</TabsTrigger>
              <TabsTrigger value="ready" className="flex-1 sm:flex-none">Ready</TabsTrigger>
              <TabsTrigger value="hallmark" className="flex-1 sm:flex-none">Hallmark</TabsTrigger>
              <TabsTrigger value="customer-orders" className="flex-1 sm:flex-none whitespace-nowrap">Customer Orders</TabsTrigger>
              <TabsTrigger value="karigars" className="flex-1 sm:flex-none">Karigars</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="total-orders" className="mt-6">
            <TotalOrdersTab />
          </TabsContent>

          <TabsContent value="ready" className="mt-6">
            <ReadyTab />
          </TabsContent>

          <TabsContent value="hallmark" className="mt-6">
            <HallmarkTab />
          </TabsContent>

          <TabsContent value="customer-orders" className="mt-6">
            <CustomerOrdersTab />
          </TabsContent>

          <TabsContent value="karigars" className="mt-6">
            <KarigarsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

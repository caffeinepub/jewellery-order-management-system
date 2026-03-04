import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import AgeingStock from "@/pages/AgeingStock";
import BarcodeScanning from "@/pages/BarcodeScanning";
import Dashboard from "@/pages/Dashboard";
import DesignImages from "@/pages/DesignImages";
import IngestOrders from "@/pages/IngestOrders";
import KarigarDetail from "@/pages/KarigarDetail";
import MasterDesigns from "@/pages/MasterDesigns";
import Reconciliation from "@/pages/Reconciliation";
import TagPrinting from "@/pages/TagPrinting";
import UnmappedCodes from "@/pages/UnmappedCodes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function RootLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile-only header with sidebar trigger */}
          <header className="flex h-12 shrink-0 items-center gap-2 px-3 md:hidden border-b border-border">
            <SidebarTrigger className="-ml-1" />
          </header>
          <main className="flex-1 min-w-0 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
});

const ingestOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ingest-orders",
  component: IngestOrders,
});

const unmappedCodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unmapped-codes",
  component: UnmappedCodes,
});

const masterDesignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/master-designs",
  component: MasterDesigns,
});

const designImagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/design-images",
  component: DesignImages,
});

const tagPrintingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tag-printing",
  component: TagPrinting,
});

const barcodeScanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/barcode-scanning",
  component: BarcodeScanning,
});

const reconciliationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reconciliation",
  component: Reconciliation,
});

const ageingStockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ageing-stock",
  component: AgeingStock,
});

const karigarDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/karigar/$name",
  component: KarigarDetail,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  ingestOrdersRoute,
  unmappedCodesRoute,
  masterDesignsRoute,
  designImagesRoute,
  tagPrintingRoute,
  barcodeScanningRoute,
  reconciliationRoute,
  ageingStockRoute,
  karigarDetailRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

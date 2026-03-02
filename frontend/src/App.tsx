import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import AppSidebar from "@/components/layout/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import IngestOrders from "@/pages/IngestOrders";
import UnmappedCodes from "@/pages/UnmappedCodes";
import MasterDesigns from "@/pages/MasterDesigns";
import DesignImages from "@/pages/DesignImages";
import TagPrinting from "@/pages/TagPrinting";
import BarcodeScanning from "@/pages/BarcodeScanning";
import KarigarDetail from "@/pages/KarigarDetail";
import Reconciliation from "@/pages/Reconciliation";
import AgeingStock from "@/pages/AgeingStock";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 2,
    },
  },
});

// Layout component with sidebar
function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0 overflow-auto">
          {/* Mobile header with sidebar trigger */}
          <header className="flex md:hidden items-center gap-2 p-3 border-b border-border bg-background sticky top-0 z-10">
            <SidebarTrigger />
            <span className="font-semibold text-sm text-foreground">KASI Jewellers</span>
          </header>
          <main className="p-0">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// Root route
const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const ingestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ingest",
  component: IngestOrders,
});

const unmappedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unmapped",
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

const karigarDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/karigar/$name",
  component: KarigarDetail,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  ingestRoute,
  unmappedRoute,
  masterDesignsRoute,
  designImagesRoute,
  tagPrintingRoute,
  barcodeScanningRoute,
  karigarDetailRoute,
  reconciliationRoute,
  ageingStockRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

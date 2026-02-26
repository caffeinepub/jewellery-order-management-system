import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import Dashboard from '@/pages/Dashboard';
import IngestOrders from '@/pages/IngestOrders';
import UnmappedCodes from '@/pages/UnmappedCodes';
import MasterDesigns from '@/pages/MasterDesigns';
import DesignImages from '@/pages/DesignImages';
import TagPrinting from '@/pages/TagPrinting';
import BarcodeScanning from '@/pages/BarcodeScanning';
import KarigarDetail from '@/pages/KarigarDetail';
import Reconciliation from '@/pages/Reconciliation';
import AgeingStock from '@/pages/AgeingStock';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
            <SidebarTrigger />
          </header>
          <main className="flex-1">
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

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const ingestOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ingest-orders',
  component: IngestOrders,
});

const unmappedCodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unmapped-codes',
  component: UnmappedCodes,
});

const masterDesignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/master-designs',
  component: MasterDesigns,
});

const designImagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/design-images',
  component: DesignImages,
});

const tagPrintingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tag-printing',
  component: TagPrinting,
});

const barcodeScanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/barcode-scanning',
  component: BarcodeScanning,
});

const karigarDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/karigar/$name',
  component: KarigarDetail,
});

const reconciliationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reconciliation',
  component: Reconciliation,
});

const ageingStockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ageing-stock',
  component: AgeingStock,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  ingestOrdersRoute,
  unmappedCodesRoute,
  masterDesignsRoute,
  designImagesRoute,
  tagPrintingRoute,
  barcodeScanningRoute,
  karigarDetailRoute,
  reconciliationRoute,
  ageingStockRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

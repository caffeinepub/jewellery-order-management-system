import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import IngestOrders from '@/pages/IngestOrders';
import Dashboard from '@/pages/Dashboard';
import MasterDesigns from '@/pages/MasterDesigns';
import DesignImages from '@/pages/DesignImages';
import TagPrinting from '@/pages/TagPrinting';
import BarcodeScanning from '@/pages/BarcodeScanning';
import UnmappedCodes from '@/pages/UnmappedCodes';
import KarigarDetail from '@/pages/KarigarDetail';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <div id="router-outlet" />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  ingestOrdersRoute,
  unmappedCodesRoute,
  masterDesignsRoute,
  designImagesRoute,
  tagPrintingRoute,
  barcodeScanningRoute,
  karigarDetailRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

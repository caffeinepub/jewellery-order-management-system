import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import { Dashboard } from '@/pages/Dashboard';
import IngestOrders from '@/pages/IngestOrders';
import { MasterDesigns } from '@/pages/MasterDesigns';
import DesignImages from '@/pages/DesignImages';
import { UnmappedCodes } from '@/pages/UnmappedCodes';
import { TagPrinting } from '@/pages/TagPrinting';
import BarcodeScanning from '@/pages/BarcodeScanning';
import { KarigarDetail } from '@/pages/KarigarDetail';

const queryClient = new QueryClient();

function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

const rootRoute = createRootRoute({ component: Layout });

const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Dashboard });
const ingestRoute = createRoute({ getParentRoute: () => rootRoute, path: '/ingest', component: IngestOrders });
const masterDesignsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/master-designs', component: MasterDesigns });
const designImagesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/design-images', component: DesignImages });
const unmappedCodesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/unmapped', component: UnmappedCodes });
const tagPrintingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tag-printing', component: TagPrinting });
const barcodeScanningRoute = createRoute({ getParentRoute: () => rootRoute, path: '/barcode-scanning', component: BarcodeScanning });
const karigarDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/karigar/$name', component: KarigarDetail });

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  ingestRoute,
  masterDesignsRoute,
  designImagesRoute,
  unmappedCodesRoute,
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

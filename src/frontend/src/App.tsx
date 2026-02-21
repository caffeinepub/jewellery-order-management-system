import { createRouter, RouterProvider, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './components/layout/AppSidebar';
import Dashboard from './pages/Dashboard';
import IngestOrders from './pages/IngestOrders';
import UnmappedCodes from './pages/UnmappedCodes';
import MasterDesigns from './pages/MasterDesigns';
import DesignImages from './pages/DesignImages';
import TagPrinting from './pages/TagPrinting';
import BarcodeScanning from './pages/BarcodeScanning';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Jewellery OMS</h2>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Toaster />
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  ingestOrdersRoute,
  unmappedCodesRoute,
  masterDesignsRoute,
  designImagesRoute,
  tagPrintingRoute,
  barcodeScanningRoute,
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
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

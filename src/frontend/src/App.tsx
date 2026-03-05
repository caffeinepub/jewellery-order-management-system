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
import LoginPage from "@/pages/LoginPage";
import MasterDesigns from "@/pages/MasterDesigns";
import Reconciliation from "@/pages/Reconciliation";
import TagPrinting from "@/pages/TagPrinting";
import UnmappedCodes from "@/pages/UnmappedCodes";
import UserManagement from "@/pages/UserManagement";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { AppRole } from "./backend";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// ── Auth Guard ─────────────────────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && !currentUser) {
      navigate({ to: "/login" });
    }
  }, [currentUser, isInitializing, navigate]);

  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!currentUser) return null;

  return <>{children}</>;
}

function RootLayout() {
  const { currentUser } = useAuth();

  // If no user, render outlet directly (for /login)
  if (!currentUser) {
    return <Outlet />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile-only header with sidebar trigger (hidden on desktop ≥1024px) */}
          <header className="flex h-12 shrink-0 items-center gap-2 px-3 lg:hidden border-b border-border">
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

// ── Protected Dashboard (redirects karigar-only users) ─────────────────────────
function ProtectedDashboard() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

// ── Admin-only wrapper ─────────────────────────────────────────────────────────
function AdminRoute({
  component: Component,
}: { component: React.ComponentType }) {
  const { currentUser, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      !isInitializing &&
      (!currentUser || currentUser.role !== AppRole.Admin)
    ) {
      navigate({ to: "/" });
    }
  }, [currentUser, isInitializing, navigate]);

  if (!currentUser || currentUser.role !== AppRole.Admin) return null;
  return <Component />;
}

// ── Staff/Admin-only wrapper ───────────────────────────────────────────────────
function StaffAdminRoute({
  component: Component,
}: { component: React.ComponentType }) {
  const { currentUser, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      !isInitializing &&
      (!currentUser || currentUser.role === AppRole.Karigar)
    ) {
      navigate({ to: "/" });
    }
  }, [currentUser, isInitializing, navigate]);

  if (!currentUser || currentUser.role === AppRole.Karigar) return null;
  return <Component />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ProtectedDashboard,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: ProtectedDashboard,
});

const ingestOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ingest-orders",
  component: () => (
    <AuthGuard>
      <StaffAdminRoute component={IngestOrders} />
    </AuthGuard>
  ),
});

const unmappedCodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unmapped-codes",
  component: () => (
    <AuthGuard>
      <StaffAdminRoute component={UnmappedCodes} />
    </AuthGuard>
  ),
});

const masterDesignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/master-designs",
  component: () => (
    <AuthGuard>
      <AdminRoute component={MasterDesigns} />
    </AuthGuard>
  ),
});

const designImagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/design-images",
  component: () => (
    <AuthGuard>
      <AdminRoute component={DesignImages} />
    </AuthGuard>
  ),
});

const tagPrintingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tag-printing",
  component: () => (
    <AuthGuard>
      <StaffAdminRoute component={TagPrinting} />
    </AuthGuard>
  ),
});

const barcodeScanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/barcode-scanning",
  component: () => (
    <AuthGuard>
      <StaffAdminRoute component={BarcodeScanning} />
    </AuthGuard>
  ),
});

const reconciliationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reconciliation",
  component: () => (
    <AuthGuard>
      <StaffAdminRoute component={Reconciliation} />
    </AuthGuard>
  ),
});

const ageingStockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ageing-stock",
  component: () => (
    <AuthGuard>
      <StaffAdminRoute component={AgeingStock} />
    </AuthGuard>
  ),
});

const karigarDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/karigar/$name",
  component: () => (
    <AuthGuard>
      <KarigarDetail />
    </AuthGuard>
  ),
});

const userManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user-management",
  component: () => (
    <AuthGuard>
      <AdminRoute component={UserManagement} />
    </AuthGuard>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
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
  userManagementRoute,
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
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

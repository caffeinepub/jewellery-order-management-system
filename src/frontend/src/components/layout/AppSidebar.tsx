import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  Clock,
  Database,
  FileCheck,
  Image,
  LayoutDashboard,
  LogOut,
  Printer,
  ScanLine,
  Shield,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AppRole } from "../../backend";
import { useAuth } from "../../context/AuthContext";
import DataResetDialog from "./DataResetDialog";

const allMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    roles: [AppRole.Admin, AppRole.Staff, AppRole.Karigar],
  },
  {
    title: "Ingest Orders",
    icon: Upload,
    path: "/ingest-orders",
    roles: [AppRole.Admin],
  },
  {
    title: "Unmapped Codes",
    icon: AlertCircle,
    path: "/unmapped-codes",
    roles: [AppRole.Admin],
  },
  {
    title: "Master Designs",
    icon: Database,
    path: "/master-designs",
    roles: [AppRole.Admin],
  },
  {
    title: "Design Images",
    icon: Image,
    path: "/design-images",
    roles: [AppRole.Admin],
  },
  {
    title: "Tag Printing",
    icon: Printer,
    path: "/tag-printing",
    roles: [AppRole.Admin, AppRole.Staff],
  },
  {
    title: "Barcode Scanning",
    icon: ScanLine,
    path: "/barcode-scanning",
    roles: [AppRole.Admin, AppRole.Staff],
  },
  {
    title: "Reconciliation",
    icon: FileCheck,
    path: "/reconciliation",
    roles: [AppRole.Admin],
  },
  {
    title: "Ageing Stock",
    icon: Clock,
    path: "/ageing-stock",
    roles: [AppRole.Admin],
  },
];

export function AppSidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [showDataResetDialog, setShowDataResetDialog] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(1024);

  const role = currentUser?.role ?? AppRole.Staff;

  // Filter menu items by role
  const menuItems = allMenuItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const roleBadge = (r: AppRole) => {
    if (r === AppRole.Admin) return "text-orange-400";
    if (r === AppRole.Karigar) return "text-amber-400";
    return "text-blue-400";
  };

  return (
    <>
      {/* On desktop: collapsible="none" keeps sidebar permanently visible.
          On mobile: collapsible="offcanvas" enables the Sheet drawer. */}
      <Sidebar collapsible={isMobile ? "offcanvas" : "none"}>
        <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold text-gold-foreground">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Jewellery OMS</h2>
              <p className="text-xs text-muted-foreground">Order Management</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === item.path}
                    >
                      <Link
                        to={item.path}
                        data-ocid={`nav.${item.title.toLowerCase().replace(/\s+/g, "-")}.link`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* User Management - Admin only */}
                {role === AppRole.Admin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === "/user-management"}
                    >
                      <Link
                        to="/user-management"
                        data-ocid="nav.user-management.link"
                      >
                        <Users className="h-4 w-4" />
                        <span>User Management</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Data Reset - Admin only */}
                {role === AppRole.Admin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setShowDataResetDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Data Reset</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
          {/* User info */}
          {currentUser && (
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                <Shield className={`h-4 w-4 ${roleBadge(currentUser.role)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentUser.name}
                </p>
                <p className={`text-xs ${roleBadge(currentUser.role)}`}>
                  {currentUser.role}
                  {currentUser.karigarName
                    ? ` · ${currentUser.karigarName}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Logout"
                data-ocid="nav.logout.button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground text-center">
              Built with <span className="text-red-400">♥</span> using{" "}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                  window.location.hostname,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline font-medium"
              >
                caffeine.ai
              </a>
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              © {new Date().getFullYear()}
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <DataResetDialog
        open={showDataResetDialog}
        onOpenChange={setShowDataResetDialog}
      />
    </>
  );
}

export default AppSidebar;

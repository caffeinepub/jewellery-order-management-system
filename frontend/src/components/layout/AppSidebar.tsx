import { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
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
import {
  LayoutDashboard,
  Upload,
  AlertCircle,
  BookOpen,
  Image,
  Tag,
  ScanLine,
  GitMerge,
  Clock,
} from "lucide-react";
import DataResetDialog from "@/components/layout/DataResetDialog";

const menuItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Ingest Orders", path: "/ingest", icon: Upload },
  { title: "Unmapped Codes", path: "/unmapped", icon: AlertCircle },
  { title: "Master Designs", path: "/master-designs", icon: BookOpen },
  { title: "Design Images", path: "/design-images", icon: Image },
  { title: "Tag Printing", path: "/tag-printing", icon: Tag },
  { title: "Barcode Scanning", path: "/barcode-scanning", icon: ScanLine },
  { title: "Reconciliation", path: "/reconciliation", icon: GitMerge },
  { title: "Ageing Stock", path: "/ageing-stock", icon: Clock },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDataReset, setShowDataReset] = useState(false);

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r border-border">
        <SidebarHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">K</span>
            </div>
            <div>
              <div className="font-bold text-foreground text-sm leading-tight">KASI Jewellers</div>
              <div className="text-xs text-muted-foreground">Order Management</div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate({ to: item.path })}
                        className="cursor-pointer"
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowDataReset(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Data Reset</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-border space-y-1">
          <div className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} KASI Jewellers
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </div>
        </SidebarFooter>
      </Sidebar>

      <DataResetDialog open={showDataReset} onOpenChange={setShowDataReset} />
    </>
  );
}

export default AppSidebar;

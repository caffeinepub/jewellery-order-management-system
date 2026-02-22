import { Home, Upload, Image, Tag, Camera, FileText, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Upload, label: "Ingest Orders", path: "/ingest-orders" },
  { icon: FileText, label: "Master Designs", path: "/master-designs" },
  { icon: Image, label: "Design Images", path: "/design-images" },
  { icon: Tag, label: "Tag Printing", path: "/tag-printing" },
  { icon: Camera, label: "Barcode Scanning", path: "/barcode-scanning" },
  { icon: Users, label: "Unmapped Codes", path: "/unmapped-codes" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <Link
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth hover:bg-accent/10 [&.active]:bg-accent/20 [&.active]:text-accent"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!isCollapsed && (
        <SidebarFooter className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined"
                  ? window.location.hostname
                  : "unknown-app"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

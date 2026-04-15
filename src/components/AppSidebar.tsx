import { Building2, LayoutDashboard, Inbox, Send, ArrowRightLeft, FileText, Users, UserCog, Shield, ScrollText, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useSidebarCounts } from "@/hooks/useSidebarCounts";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Inbox,
  Send,
  ArrowRightLeft,
  FileText,
  Building2,
  Users,
  UserCog,
  Shield,
  ScrollText,
};

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { data: menus = [] } = useMenuPermissions();
  const { data: counts } = useSidebarCounts();

  const buatSuratNames = ["surat_masuk", "surat_keluar", "surat_internal"];
  const kotakMasukNames = ["inbox_internal", "inbox_tebusan", "disposisi"];
  const masterNames = ["master_direktorat", "master_divisi", "master_user"];
  const settingNames = ["rbac", "audit_log"];
  const dashboardMenus = menus.filter(m => m.menu_name === "dashboard");
  const buatSuratMenus = menus.filter(m => buatSuratNames.includes(m.menu_name));
  const kotakMasukMenus = menus.filter(m => kotakMasukNames.includes(m.menu_name));
  const templateMenus = menus.filter(m => m.menu_name === "template_surat");
  const masterMenus = menus.filter(m => masterNames.includes(m.menu_name));
  const settingMenus = menus.filter(m => settingNames.includes(m.menu_name));

  // Map menu_name to draft count
  const badgeMap: Record<string, number> = {
    surat_masuk: counts?.surat_masuk ?? 0,
    surat_keluar: counts?.surat_keluar ?? 0,
    surat_internal: counts?.surat_internal ?? 0,
    disposisi: counts?.disposisi ?? 0,
  };

  const renderMenuItem = (item: typeof menus[0]) => {
    const Icon = iconMap[item.menu_icon] || LayoutDashboard;
    const count = badgeMap[item.menu_name] ?? 0;
    return (
      <SidebarMenuItem key={item.menu_name}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.menu_path}
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.menu_label}</span>
            {count > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {count > 99 ? "99+" : count}
              </Badge>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">MyEGA</span>
            <span className="text-xs text-sidebar-foreground/60">PT Berdikari</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {dashboardMenus.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{dashboardMenus.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {buatSuratMenus.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
              Buat Surat
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{buatSuratMenus.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {kotakMasukMenus.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
              Kotak Masuk
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{kotakMasukMenus.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Template Surat menu hidden for now */}

        {masterMenus.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
              Master Data
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{masterMenus.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {settingMenus.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
              Pengaturan
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{settingMenus.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
            {profile?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || "User"}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

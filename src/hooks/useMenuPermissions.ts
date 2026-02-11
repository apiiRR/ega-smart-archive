import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MenuPermission {
  menu_name: string;
  menu_label: string;
  menu_icon: string;
  menu_path: string;
  sort_order: number;
  actions: string[];
}

export function useMenuPermissions() {
  const { user, roles } = useAuth();

  return useQuery({
    queryKey: ["menu-permissions", user?.id, roles],
    queryFn: async (): Promise<MenuPermission[]> => {
      if (!user) return [];

      // Fetch all role_permissions for user's roles, joined with permissions and menus
      const { data, error } = await supabase
        .from("role_permissions")
        .select(`
          role,
          data_scope,
          permissions:permission_id (
            action,
            menus:menu_id (
              name,
              label,
              icon,
              path,
              sort_order
            )
          )
        `)
        .in("role", roles as any);

      if (error || !data) return [];

      // Group by menu
      const menuMap = new Map<string, MenuPermission>();
      for (const rp of data) {
        const perm = rp.permissions as any;
        if (!perm?.menus) continue;
        const menu = perm.menus;
        const key = menu.name;
        if (!menuMap.has(key)) {
          menuMap.set(key, {
            menu_name: menu.name,
            menu_label: menu.label,
            menu_icon: menu.icon || "Circle",
            menu_path: menu.path,
            sort_order: menu.sort_order || 0,
            actions: [],
          });
        }
        const entry = menuMap.get(key)!;
        if (!entry.actions.includes(perm.action)) {
          entry.actions.push(perm.action);
        }
      }

      return Array.from(menuMap.values()).sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled: !!user && roles.length > 0,
  });
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, Save, Loader2 } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";

const ROLES: { value: Enums<"app_role">; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "direktur", label: "Direktur" },
  { value: "general_manager", label: "General Manager" },
  { value: "pegawai", label: "Pegawai" },
];

const ACTIONS = ["read", "create", "update", "delete", "approve", "dispose"];
const SCOPES = [
  { value: "all", label: "Semua" },
  { value: "own_division", label: "Divisi Sendiri" },
  { value: "own", label: "Milik Sendiri" },
];

interface MenuWithPerms {
  menu_id: string;
  menu_name: string;
  menu_label: string;
  permissions: {
    perm_id: string;
    action: string;
  }[];
}

interface RolePermEntry {
  permission_id: string;
  data_scope: string;
}

export default function Rbac() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Enums<"app_role">>("pegawai");
  const [localPerms, setLocalPerms] = useState<Record<string, RolePermEntry>>({});
  const [dirty, setDirty] = useState(false);

  // Fetch menus + permissions
  const { data: menus = [], isLoading: menusLoading } = useQuery({
    queryKey: ["rbac-menus"],
    queryFn: async () => {
      const { data: menuData } = await supabase
        .from("menus")
        .select("id, name, label")
        .order("sort_order");
      const { data: permData } = await supabase
        .from("permissions")
        .select("id, action, menu_id");

      const result: MenuWithPerms[] = (menuData || []).map((m) => ({
        menu_id: m.id,
        menu_name: m.name,
        menu_label: m.label,
        permissions: (permData || [])
          .filter((p) => p.menu_id === m.id)
          .map((p) => ({ perm_id: p.id, action: p.action })),
      }));
      return result;
    },
  });

  // Fetch role_permissions for selected role
  const { data: rolePerms = [], isLoading: permsLoading } = useQuery({
    queryKey: ["rbac-role-perms", selectedRole],
    queryFn: async () => {
      const { data } = await supabase
        .from("role_permissions")
        .select("id, permission_id, data_scope, role")
        .eq("role", selectedRole);
      return data || [];
    },
  });

  // Sync rolePerms to local state when role changes
  const initLocal = () => {
    const map: Record<string, RolePermEntry> = {};
    rolePerms.forEach((rp) => {
      map[rp.permission_id] = { permission_id: rp.permission_id, data_scope: rp.data_scope };
    });
    setLocalPerms(map);
    setDirty(false);
  };

  // Re-init when rolePerms data changes
  const [lastKey, setLastKey] = useState("");
  const currentKey = `${selectedRole}-${rolePerms.length}-${rolePerms.map(r => r.id).join(",")}`;
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    initLocal();
  }

  const togglePerm = (permId: string) => {
    setLocalPerms((prev) => {
      const next = { ...prev };
      if (next[permId]) {
        delete next[permId];
      } else {
        next[permId] = { permission_id: permId, data_scope: "own_division" };
      }
      return next;
    });
    setDirty(true);
  };

  const changeScope = (permId: string, scope: string) => {
    setLocalPerms((prev) => ({
      ...prev,
      [permId]: { ...prev[permId], data_scope: scope },
    }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing role_permissions for this role
      const { error: delErr } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role", selectedRole);
      if (delErr) throw delErr;

      // Insert new entries
      const entries = Object.values(localPerms).map((lp) => ({
        role: selectedRole,
        permission_id: lp.permission_id,
        data_scope: lp.data_scope,
      }));

      if (entries.length > 0) {
        const { error: insErr } = await supabase
          .from("role_permissions")
          .insert(entries);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-role-perms", selectedRole] });
      toast.success(`Permission untuk ${ROLES.find(r => r.value === selectedRole)?.label} berhasil disimpan`);
      setDirty(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isLoading = menusLoading || permsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Role & Akses
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola hak akses (permission) untuk setiap role pada masing-masing menu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matriks Permission</CardTitle>
          <CardDescription>
            Pilih role, lalu centang aksi yang diizinkan beserta cakupan datanya untuk setiap menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Role:</span>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as Enums<"app_role">)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!dirty || saveMutation.isPending}
              size="sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Simpan Perubahan
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Memuat data...</div>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Menu</TableHead>
                    {ACTIONS.map((a) => (
                      <TableHead key={a} className="text-center capitalize min-w-[90px]">
                        {a}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus.map((menu) => (
                    <TableRow key={menu.menu_id}>
                      <TableCell className="font-medium">{menu.menu_label}</TableCell>
                      {ACTIONS.map((action) => {
                        const perm = menu.permissions.find((p) => p.action === action);
                        if (!perm) {
                          return (
                            <TableCell key={action} className="text-center">
                              <span className="text-muted-foreground/30">—</span>
                            </TableCell>
                          );
                        }
                        const isChecked = !!localPerms[perm.perm_id];
                        const scope = localPerms[perm.perm_id]?.data_scope || "own_division";

                        return (
                          <TableCell key={action} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => togglePerm(perm.perm_id)}
                              />
                              {isChecked && (
                                <Select
                                  value={scope}
                                  onValueChange={(v) => changeScope(perm.perm_id, v)}
                                >
                                  <SelectTrigger className="h-6 w-24 text-[10px] px-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SCOPES.map((s) => (
                                      <SelectItem key={s.value} value={s.value} className="text-xs">
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

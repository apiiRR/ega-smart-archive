import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Profile = Tables<"profiles"> & { division?: { name: string } | null; roles?: string[] };

const ROLE_OPTIONS: { value: Enums<"app_role">; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "direktur", label: "Direktur" },
  { value: "general_manager", label: "General Manager" },
  { value: "pegawai", label: "Pegawai" },
];

const roleBadgeColor: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  admin: "bg-primary/10 text-primary border-primary/20",
  direktur: "bg-accent/10 text-accent-foreground border-accent/20",
  general_manager: "bg-success/10 text-success border-success/20",
  pegawai: "bg-muted text-muted-foreground border-border",
};

export default function MasterUsers() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", nip: "", division_id: "", role: "pegawai" as Enums<"app_role">, password: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["users-master"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, divisions:division_id(name)")
        .order("name");
      if (error) throw error;

      // Fetch all user_roles
      const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      return (profiles || []).map((p) => ({
        ...p,
        division: (p.divisions as any) || null,
        roles: roleMap[p.id] || [],
      })) as Profile[];
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions-list"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name").order("name");
      return data || [];
    },
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (editing) {
        // Update profile
        const { error } = await supabase.from("profiles").update({
          name: form.name, nip: form.nip || null, division_id: form.division_id || null,
        }).eq("id", editing.id);
        if (error) throw error;

        // Update role: delete existing, insert new
        await supabase.from("user_roles").delete().eq("user_id", editing.id);
        const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: editing.id, role: form.role });
        if (roleErr) throw roleErr;
      } else {
        // Create user via edge function or direct sign up not possible from client
        // We'll create the auth user via supabase admin — but since we can't from client,
        // we use supabase.auth.signUp which requires the user to confirm email.
        // For admin-created users, we'll use an edge function approach.
        toast.error("Untuk menambah user baru, gunakan halaman registrasi atau hubungi Super Admin.");
        throw new Error("Cannot create user from client");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-master"] });
      toast.success("User berhasil diperbarui");
      closeDialog();
    },
    onError: (e: any) => {
      if (e.message !== "Cannot create user from client") toast.error(e.message);
    },
  });

  const openEdit = (row: Profile) => {
    setEditing(row);
    setForm({
      name: row.name,
      email: row.email,
      nip: row.nip || "",
      division_id: row.division_id || "",
      role: (row.roles?.[0] as Enums<"app_role">) || "pegawai",
      password: "",
    });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master User</h1>
        <p className="text-muted-foreground mt-1">Kelola data pengguna, divisi, dan role.</p>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Cari nama atau email..."
        searchKeys={["name", "email", "nip"]}
        columns={[
          { key: "name", label: "Nama" },
          { key: "email", label: "Email" },
          { key: "nip", label: "NIP", render: (row) => row.nip || "-" },
          { key: "division", label: "Divisi", render: (row) => row.division?.name || "-" },
          {
            key: "roles",
            label: "Role",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                {(row.roles || []).map((r) => (
                  <Badge key={r} variant="outline" className={roleBadgeColor[r] || ""}>
                    {ROLE_OPTIONS.find(o => o.value === r)?.label || r}
                  </Badge>
                ))}
              </div>
            ),
          },
        ]}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>NIP</Label>
              <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="space-y-2">
              <Label>Divisi</Label>
              <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Enums<"app_role"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={() => saveProfile.mutate()} disabled={!form.name || saveProfile.isPending}>
              {saveProfile.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

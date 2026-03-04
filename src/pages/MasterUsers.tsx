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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Plus, Trash2, KeyRound, MoreHorizontal } from "lucide-react";
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
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", username: "", nip: "", division_id: "",
    role: "pegawai" as Enums<"app_role">, password: "",
  });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["users-master"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, divisions:division_id(name)")
        .order("name");
      if (error) throw error;

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

  const createUser = useMutation({
    mutationFn: async () => {
      if (!form.username || !form.name || !form.password) {
        throw new Error("Username, nama, dan password wajib diisi");
      }
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: form.username, name: form.name,
          email: form.email || undefined, password: form.password,
          nip: form.nip || undefined, division_id: form.division_id || undefined,
          role: form.role,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-master"] });
      toast.success("User berhasil ditambahkan");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("profiles").update({
        name: form.name, nip: form.nip || null, division_id: form.division_id || null,
        username: form.username || null,
      }).eq("id", editing.id);
      if (error) throw error;

      await supabase.from("user_roles").delete().eq("user_id", editing.id);
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: editing.id, role: form.role });
      if (roleErr) throw roleErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-master"] });
      toast.success("User berhasil diperbarui");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-master"] });
      toast.success("User berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { user_id: userId, new_password: password },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Password berhasil diperbarui");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", username: "", nip: "", division_id: "", role: "pegawai", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (row: Profile) => {
    setEditing(row);
    setForm({
      name: row.name, email: row.email,
      username: (row as any).username || "",
      nip: row.nip || "",
      division_id: row.division_id || "",
      role: (row.roles?.[0] as Enums<"app_role">) || "pegawai",
      password: "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const isCreating = !editing;
  const isSaving = isCreating ? createUser.isPending : saveProfile.isPending;

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
        onAdd={openAdd}
        addLabel="Tambah User"
        columns={[
          { key: "name", label: "Nama" },
          { key: "username" as any, label: "Username", render: (row) => (row as any).username || "-" },
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setResetTarget(row); setNewPassword(""); }}>
                <KeyRound className="h-4 w-4 mr-2" /> Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}>
                <Trash2 className="h-4 w-4 mr-2" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? "Tambah User Baru" : "Edit User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username untuk login" disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {isCreating && (
              <>
                <div className="space-y-2">
                  <Label>Email (opsional)</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" />
                  <p className="text-xs text-muted-foreground">Kosongkan jika tidak ada email, akan dibuatkan otomatis.</p>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder="Min. 6 karakter" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>NIP</Label>
              <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="space-y-2">
              <Label>Divisi</Label>
              <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Enums<"app_role"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={() => isCreating ? createUser.mutate() : saveProfile.mutate()} disabled={(!form.name || !form.username) || isSaving}>
              {isSaving ? "Menyimpan..." : isCreating ? "Tambah User" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password — {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="Min. 6 karakter" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setNewPassword(""); }}>Batal</Button>
            <Button
              onClick={() => resetTarget && resetPassword.mutate({ userId: resetTarget.id, password: newPassword })}
              disabled={newPassword.length < 6 || resetPassword.isPending}
            >
              {resetPassword.isPending ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

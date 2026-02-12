import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Tables } from "@/integrations/supabase/types";

type Division = Tables<"divisions"> & { directorates?: { name: string } | null; gm_profile?: { name: string } | null };

export default function MasterDivisions() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Division | null>(null);
  const [form, setForm] = useState({ name: "", directorate_id: "", gm_user_id: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("divisions")
        .select("*, directorates(name)")
        .order("name");
      if (error) throw error;
      // Fetch GM names separately
      const gmIds = (data || []).filter(d => d.gm_user_id).map(d => d.gm_user_id!);
      let gmMap: Record<string, string> = {};
      if (gmIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", gmIds);
        if (profiles) profiles.forEach(p => { gmMap[p.id] = p.name; });
      }
      return (data || []).map(d => ({ ...d, gm_profile: d.gm_user_id ? { name: gmMap[d.gm_user_id] || "-" } : null })) as Division[];
    },
  });

  const { data: directorates = [] } = useQuery({
    queryKey: ["directorates"],
    queryFn: async () => {
      const { data } = await supabase.from("directorates").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name").order("name");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, directorate_id: form.directorate_id, gm_user_id: form.gm_user_id || null };
      if (editing) {
        const { error } = await supabase.from("divisions").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("divisions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["divisions"] });
      toast.success(editing ? "Divisi berhasil diperbarui" : "Divisi berhasil ditambahkan");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("divisions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["divisions"] });
      toast.success("Divisi berhasil dihapus");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", directorate_id: "", gm_user_id: "" }); setDialogOpen(true); };
  const openEdit = (row: Division) => {
    setEditing(row);
    setForm({ name: row.name, directorate_id: row.directorate_id, gm_user_id: row.gm_user_id || "" });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Divisi</h1>
        <p className="text-muted-foreground mt-1">Kelola data divisi dan relasi ke direktorat.</p>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Cari divisi..."
        searchKeys={["name"]}
        onAdd={openAdd}
        addLabel="Tambah Divisi"
        columns={[
          { key: "name", label: "Nama Divisi" },
          { key: "directorate", label: "Direktorat", render: (row) => (row.directorates as any)?.name || "-" },
          { key: "gm", label: "General Manager", render: (row) => row.gm_profile?.name || "-" },
        ]}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Divisi" : "Tambah Divisi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Divisi</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama divisi" />
            </div>
            <div className="space-y-2">
              <Label>Direktorat</Label>
              <Select value={form.directorate_id} onValueChange={(v) => setForm({ ...form, directorate_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih direktorat" /></SelectTrigger>
                <SelectContent>
                  {directorates.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>General Manager (opsional)</Label>
              <Select value={form.gm_user_id} onValueChange={(v) => setForm({ ...form, gm_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.directorate_id || save.isPending}>
              {save.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Divisi?</AlertDialogTitle>
            <AlertDialogDescription>Data yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

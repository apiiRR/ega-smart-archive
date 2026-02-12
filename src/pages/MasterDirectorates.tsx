import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Directorate = Tables<"directorates">;

export default function MasterDirectorates() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Directorate | null>(null);
  const [form, setForm] = useState({ name: "", director_name: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["directorates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("directorates").select("*").order("name");
      if (error) throw error;
      return data as Directorate[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("directorates").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("directorates").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directorates"] });
      toast.success(editing ? "Direktorat berhasil diperbarui" : "Direktorat berhasil ditambahkan");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("directorates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directorates"] });
      toast.success("Direktorat berhasil dihapus");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", director_name: "" }); setDialogOpen(true); };
  const openEdit = (row: Directorate) => { setEditing(row); setForm({ name: row.name, director_name: row.director_name }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Direktorat</h1>
        <p className="text-muted-foreground mt-1">Kelola data direktorat organisasi.</p>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Cari direktorat..."
        searchKeys={["name", "director_name"]}
        onAdd={openAdd}
        addLabel="Tambah Direktorat"
        columns={[
          { key: "name", label: "Nama Direktorat" },
          { key: "director_name", label: "Nama Direktur" },
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
            <DialogTitle>{editing ? "Edit Direktorat" : "Tambah Direktorat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Direktorat</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama direktorat" />
            </div>
            <div className="space-y-2">
              <Label>Nama Direktur</Label>
              <Input value={form.director_name} onChange={(e) => setForm({ ...form, director_name: e.target.value })} placeholder="Nama direktur" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.director_name || save.isPending}>
              {save.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Direktorat?</AlertDialogTitle>
            <AlertDialogDescription>Data yang dihapus tidak dapat dikembalikan. Pastikan tidak ada divisi yang terkait.</AlertDialogDescription>
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

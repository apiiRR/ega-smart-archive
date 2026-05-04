import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { DispositionThread } from "@/components/DispositionThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadPreview } from "@/components/FileUploadPreview";
import { Badge } from "@/components/ui/badge";
import { useLetterUnreadDispositions } from "@/hooks/useLetterUnreadDispositions";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Plus, ArrowLeft, Bell } from "lucide-react";
import { AttachmentInlinePreview } from "@/components/AttachmentInlinePreview";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { Tables } from "@/integrations/supabase/types";

type SuratMasukRow = Tables<"surat_masuk">;

export default function SuratMasuk() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ nama_surat: "", nomor_surat: "", asal_surat: "", catatan: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["surat_masuk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surat_masuk")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SuratMasukRow[];
    },
  });

  const ownIds = data.filter(s => s.created_by === user?.id).map(s => s.id);
  const { data: unreadMap } = useLetterUnreadDispositions("surat_masuk", ownIds);

  const detail = data.find(s => s.id === detailId);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let file_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `surat-masuk/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("letter-attachments").upload(path, file);
        if (upErr) throw upErr;
        file_url = path;
      }
      const { error } = await supabase.from("surat_masuk").insert({
        ...form,
        created_by: user.id,
        file_url,
        status: "confirm",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surat_masuk"] });
      toast.success("Surat masuk berhasil ditambahkan");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });


  const openAdd = () => {
    setForm({ nama_surat: "", nomor_surat: "", asal_surat: "", catatan: "" });
    setFile(null);
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setFile(null); };

  // Detail view
  if (detailId && detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{detail.nama_surat}</h2>
              <p className="text-sm text-muted-foreground">No: {detail.nomor_surat}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Asal Surat:</span>
              <p className="font-medium">{detail.asal_surat}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal Masuk:</span>
              <p className="font-medium">{format(new Date(detail.created_at), "dd MMMM yyyy", { locale: idLocale })}</p>
            </div>
          </div>

          {detail.catatan && (
            <div className="text-sm">
              <span className="text-muted-foreground">Catatan:</span>
              <p className="mt-1">{detail.catatan}</p>
            </div>
          )}

          {detail.file_url && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Lampiran:</span>
              <AttachmentInlinePreview filePath={detail.file_url} label={detail.nama_surat} />
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground italic">
              Surat ini sudah tersimpan dan tidak dapat diubah.
            </p>
          </div>
        </div>

        <DispositionThread suratMasukId={detail.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Surat Masuk</h1>
        <p className="text-muted-foreground mt-1">Kelola surat masuk eksternal dan disposisi.</p>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Cari surat masuk..."
        searchKeys={["nama_surat", "nomor_surat", "asal_surat"]}
        onAdd={openAdd}
        addLabel="Tambah Surat Masuk"
        columns={[
          {
            key: "nomor_surat",
            label: "No. Surat",
            render: (row) => {
              const c = unreadMap?.get(row.id) ?? 0;
              return (
                <div className="flex items-center gap-2">
                  <span>{row.nomor_surat}</span>
                  {c > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
                      <Bell className="h-3 w-3" /> {c} balasan baru
                    </Badge>
                  )}
                </div>
              );
            },
          },
          { key: "nama_surat", label: "Nama Surat" },
          { key: "asal_surat", label: "Asal Surat" },
          {
            key: "created_at",
            label: "Tanggal",
            render: (row) => format(new Date(row.created_at), "dd/MM/yyyy"),
          },
        ]}
        rowClassName={(row) => ((unreadMap?.get(row.id) ?? 0) > 0 ? "bg-primary/5 font-medium" : "")}
        actions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => setDetailId(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Tambah Surat Masuk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label>Nama Surat</Label>
              <Input value={form.nama_surat} onChange={e => setForm({ ...form, nama_surat: e.target.value })} placeholder="Nama/judul surat" />
            </div>
            <div className="space-y-2">
              <Label>Nomor Surat</Label>
              <Input value={form.nomor_surat} onChange={e => setForm({ ...form, nomor_surat: e.target.value })} placeholder="No. surat" />
            </div>
            <div className="space-y-2">
              <Label>Asal Surat</Label>
              <Input value={form.asal_surat} onChange={e => setForm({ ...form, asal_surat: e.target.value })} placeholder="Instansi/perusahaan pengirim" />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan (opsional)" rows={3} />
            </div>
            <FileUploadPreview
              label="Scan Surat (Opsional)"
              file={file}
              onChange={setFile}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-card">
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.nama_surat || !form.nomor_surat || !form.asal_surat || save.isPending}
            >
              {save.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

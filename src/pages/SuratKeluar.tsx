import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { DispositionThread } from "@/components/DispositionThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Eye, ArrowLeft, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLetterUnreadDispositions } from "@/hooks/useLetterUnreadDispositions";
import { AttachmentInlinePreview } from "@/components/AttachmentInlinePreview";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { Tables } from "@/integrations/supabase/types";
import { FileUploadPreview } from "@/components/FileUploadPreview";

type SuratKeluarRow = Tables<"surat_keluar">;

export default function SuratKeluar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nama_surat: "", nomor_surat: "", perihal: "", tujuan: "",
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["surat_keluar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surat_keluar")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SuratKeluarRow[];
    },
  });

  const ownIds = data.filter(s => s.created_by === user?.id).map(s => s.id);
  const { data: unreadMap } = useLetterUnreadDispositions("surat_keluar", ownIds);

  const detail = data.find(s => s.id === detailId);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!file) throw new Error("Dokumen scan wajib diunggah");
      const ext = file.name.split(".").pop();
      const path = `surat-keluar/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("letter-attachments").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("surat_keluar").insert({
        ...form,
        created_by: user.id,
        file_url: path,
        status: "confirm",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surat_keluar"] });
      toast.success("Surat keluar berhasil ditambahkan");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setForm({ nama_surat: "", nomor_surat: "", perihal: "", tujuan: "" });
    setFile(null);
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setFile(null); };

  if (detailId && detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{detail.nama_surat}</h2>
            <p className="text-sm text-muted-foreground">No: {detail.nomor_surat}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Perihal:</span>
              <p className="font-medium">{detail.perihal}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tujuan:</span>
              <p className="font-medium">{detail.tujuan}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal:</span>
              <p className="font-medium">{format(new Date(detail.created_at), "dd MMMM yyyy", { locale: idLocale })}</p>
            </div>
          </div>

          {detail.file_url && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Dokumen:</span>
              <AttachmentInlinePreview filePath={detail.file_url} label={detail.nama_surat} />
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground italic">
              Surat ini sudah tersimpan dan tidak dapat diubah.
            </p>
          </div>
        </div>

        <DispositionThread suratKeluarId={detail.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Surat Keluar</h1>
        <p className="text-muted-foreground mt-1">Kelola surat keluar dan workflow persetujuan.</p>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Cari surat keluar..."
        searchKeys={["nama_surat", "nomor_surat", "perihal", "tujuan"]}
        onAdd={openAdd}
        addLabel="Buat Surat Keluar"
        columns={[
          { key: "nomor_surat", label: "No. Surat" },
          { key: "nama_surat", label: "Nama Surat" },
          { key: "tujuan", label: "Tujuan" },
          { key: "perihal", label: "Perihal" },
          {
            key: "created_at",
            label: "Tanggal",
            render: (row) => format(new Date(row.created_at), "dd/MM/yyyy"),
          },
        ]}
        actions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => setDetailId(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Buat Surat Keluar</DialogTitle>
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
              <Label>Perihal</Label>
              <Input value={form.perihal} onChange={e => setForm({ ...form, perihal: e.target.value })} placeholder="Perihal surat" />
            </div>
            <div className="space-y-2">
              <Label>Tujuan</Label>
              <Input value={form.tujuan} onChange={e => setForm({ ...form, tujuan: e.target.value })} placeholder="Tujuan pengiriman" />
            </div>
            <FileUploadPreview
              label="Dokumen Scan"
              required
              file={file}
              onChange={setFile}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-card">
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.nama_surat || !form.nomor_surat || !form.perihal || !form.tujuan || !file || save.isPending}
            >
              {save.isPending ? "Menyimpan..." : "Simpan Surat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

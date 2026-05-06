import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Eye, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AttachmentInlinePreview } from "@/components/AttachmentInlinePreview";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { FileUploadPreview } from "@/components/FileUploadPreview";

type ArsipKind = "arsip" | "masuk" | "internal";

interface ArsipRow {
  id: string;
  kind: ArsipKind;
  nomor_surat: string;
  nama_surat: string;
  perihal: string;
  created_at: string;
  file_url: string | null;
  // raw refs
  source: any;
}

const kindMeta: Record<ArsipKind, { label: string; className: string }> = {
  arsip: { label: "Arsip Surat", className: "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200" },
  masuk: { label: "Surat Masuk", className: "bg-blue-100 text-blue-900 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200" },
  internal: { label: "Surat Internal", className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200" },
};

export default function SuratKeluar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nama_surat: "", nomor_surat: "", perihal: "", tujuan: "",
  });

  const { data: arsipData = [], isLoading: l1 } = useQuery({
    queryKey: ["surat_keluar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("surat_keluar").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: masukData = [], isLoading: l2 } = useQuery({
    queryKey: ["surat_masuk_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("surat_masuk").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: internalData = [], isLoading: l3 } = useQuery({
    queryKey: ["surat_internal_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("surat_internal").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = l1 || l2 || l3;

  const rows: ArsipRow[] = useMemo(() => {
    const list: ArsipRow[] = [
      ...arsipData.map((s: any) => ({
        id: s.id, kind: "arsip" as const, nomor_surat: s.nomor_surat,
        nama_surat: s.nama_surat, perihal: s.perihal, created_at: s.created_at,
        file_url: s.file_url, source: s,
      })),
      ...masukData.map((s: any) => ({
        id: s.id, kind: "masuk" as const, nomor_surat: s.nomor_surat,
        nama_surat: s.nama_surat, perihal: s.asal_surat, created_at: s.created_at,
        file_url: s.file_url, source: s,
      })),
      ...internalData.map((s: any) => ({
        id: s.id, kind: "internal" as const, nomor_surat: s.nomor_surat,
        nama_surat: s.nama_surat, perihal: s.perihal, created_at: s.created_at,
        file_url: s.file_url, source: s,
      })),
    ];
    return list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [arsipData, masukData, internalData]);

  const detail = arsipData.find((s: any) => s.id === detailId);

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
      toast.success("Arsip surat berhasil ditambahkan");
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

  const openRow = (row: ArsipRow) => {
    if (row.kind === "arsip") {
      setDetailId(row.id);
    } else if (row.kind === "masuk") {
      navigate("/surat-masuk");
    } else {
      navigate("/surat-internal");
    }
  };

  if (detailId && detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={kindMeta.arsip.className}>{kindMeta.arsip.label}</Badge>
          </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Arsip Surat</h1>
        <p className="text-muted-foreground mt-1">
          Daftar arsip surat, surat masuk, dan surat internal dalam satu tampilan.
        </p>
      </div>

      <DataTable
        data={rows}
        isLoading={isLoading}
        searchPlaceholder="Cari arsip surat..."
        searchKeys={["nama_surat", "nomor_surat", "perihal"]}
        onAdd={openAdd}
        addLabel="Tambah Arsip Surat"
        columns={[
          {
            key: "kind",
            label: "Jenis",
            render: (row) => (
              <Badge variant="secondary" className={kindMeta[row.kind].className}>
                {kindMeta[row.kind].label}
              </Badge>
            ),
          },
          { key: "nomor_surat", label: "No. Surat" },
          { key: "nama_surat", label: "Nama Surat" },
          { key: "perihal", label: "Perihal/Asal" },
          {
            key: "created_at",
            label: "Tanggal",
            render: (row) => format(new Date(row.created_at), "dd/MM/yyyy"),
          },
        ]}
        actions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openRow(row)} title={row.kind === "arsip" ? "Lihat detail" : "Buka di menu asli"}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Tambah Arsip Surat</DialogTitle>
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
              {save.isPending ? "Menyimpan..." : "Simpan Arsip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

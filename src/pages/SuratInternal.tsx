import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { DispositionThread } from "@/components/DispositionThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Eye, ArrowLeft, Loader2 } from "lucide-react";
import { FileUploadPreview } from "@/components/FileUploadPreview";
import { AttachmentInlinePreview } from "@/components/AttachmentInlinePreview";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";

interface OrgUnit {
  id: string;
  name: string;
  type: "division" | "directorate";
}

function MultiSelectOrg({
  label, selected, onChange, options,
}: {
  label: string; selected: string[]; onChange: (v: string[]) => void; options: OrgUnit[];
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  const selectedNames = options.filter(o => selected.includes(o.id)).map(o => o.name);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal h-auto min-h-10">
            {selectedNames.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedNames.map(n => (
                  <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Pilih {label.toLowerCase()}...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-60 overflow-y-auto p-2" align="start">
          {["directorate", "division"].map(type => {
            const items = options.filter(o => o.type === type);
            if (items.length === 0) return null;
            return (
              <div key={type} className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
                  {type === "directorate" ? "Direktorat" : "Divisi"}
                </p>
                {items.map(o => (
                  <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                    <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
                    <span className="text-sm">{o.name}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function SuratInternal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nama_surat: "", nomor_surat: "", perihal: "",
    tujuan: [] as string[], tebusan: [] as string[],
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["surat_internal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surat_internal")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orgUnits = [] } = useQuery({
    queryKey: ["org-units"],
    queryFn: async () => {
      const [divRes, dirRes] = await Promise.all([
        supabase.from("divisions").select("id, name").order("name"),
        supabase.from("directorates").select("id, name").order("name"),
      ]);
      const units: OrgUnit[] = [];
      (dirRes.data || []).forEach(d => units.push({ id: d.id, name: d.name, type: "directorate" }));
      (divRes.data || []).forEach(d => units.push({ id: d.id, name: d.name, type: "division" }));
      return units;
    },
  });

  const safeOrgUnits = Array.isArray(orgUnits) ? orgUnits : [];
  const orgMap = Object.fromEntries(safeOrgUnits.map(o => [o.id, o.name]));
  const detail = items.find(s => s.id === detailId);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!form.nomor_surat || !form.nama_surat || !form.perihal) throw new Error("Field wajib belum diisi");
      if (form.tujuan.length === 0) throw new Error("Tujuan wajib dipilih");
      if (!file) throw new Error("Dokumen scan wajib diunggah");

      const ext = file.name.split(".").pop();
      const path = `surat-internal/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("letter-attachments").upload(path, file);
      if (upErr) throw upErr;

      const { error } = await supabase.from("surat_internal").insert({
        nomor_surat: form.nomor_surat,
        nama_surat: form.nama_surat,
        perihal: form.perihal,
        tujuan: form.tujuan,
        tebusan: form.tebusan,
        file_url: path,
        created_by: user.id,
        status: "confirm",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surat_internal"] });
      toast.success("Surat internal berhasil dibuat");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setForm({ nama_surat: "", nomor_surat: "", perihal: "", tujuan: [], tebusan: [] });
    setFile(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFile(null);
  };

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
              <div className="flex flex-wrap gap-1 mt-1">
                {(Array.isArray(detail.tujuan) ? detail.tujuan : []).map((id: string) => (
                  <Badge key={id} variant="secondary" className="text-xs">{orgMap[id] || id}</Badge>
                ))}
              </div>
            </div>
            {Array.isArray(detail.tebusan) && detail.tebusan.length > 0 && (
              <div>
                <span className="text-muted-foreground">Tebusan:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detail.tebusan.map((id: string) => (
                    <Badge key={id} variant="outline" className="text-xs">{orgMap[id] || id}</Badge>
                  ))}
                </div>
              </div>
            )}
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
            <p className="text-sm text-muted-foreground italic">Surat ini sudah tersimpan dan tidak dapat diubah.</p>
          </div>
        </div>

        <DispositionThread suratInternalId={detail.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Surat Internal</h1>
        <p className="text-muted-foreground mt-1">Buat dan kelola surat internal antar divisi/direktorat.</p>
      </div>

      <DataTable
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Cari surat internal..."
        searchKeys={["nama_surat", "nomor_surat", "perihal"]}
        onAdd={openAdd}
        addLabel="Buat Surat Internal"
        columns={[
          { key: "nomor_surat", label: "No. Surat" },
          { key: "nama_surat", label: "Nama Surat" },
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Buat Surat Internal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Surat</Label>
                <Input value={form.nama_surat} onChange={e => setForm({ ...form, nama_surat: e.target.value })} placeholder="Judul surat" />
              </div>
              <div className="space-y-2">
                <Label>Nomor Surat</Label>
                <Input value={form.nomor_surat} onChange={e => setForm({ ...form, nomor_surat: e.target.value })} placeholder="No. surat" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perihal</Label>
              <Input value={form.perihal} onChange={e => setForm({ ...form, perihal: e.target.value })} placeholder="Perihal surat" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MultiSelectOrg label="Tujuan" selected={form.tujuan} onChange={v => setForm({ ...form, tujuan: v })} options={safeOrgUnits} />
              <MultiSelectOrg label="Tebusan (Opsional)" selected={form.tebusan} onChange={v => setForm({ ...form, tebusan: v })} options={safeOrgUnits} />
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
            <Button onClick={() => save.mutate()} disabled={!form.nama_surat || !form.nomor_surat || !form.perihal || form.tujuan.length === 0 || !file || save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Simpan Surat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

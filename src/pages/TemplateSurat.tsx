import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { LetterEditor } from "@/components/LetterEditor";
import { LetterPreview } from "@/components/LetterPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FileText, Pencil, Trash2, Eye, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Template = Tables<"letter_templates">;

const CATEGORIES = [
  "Surat Undangan",
  "Surat Keputusan",
  "Surat Perintah",
  "Surat Pemberitahuan",
  "Surat Keterangan",
  "Memo Internal",
  "Lain-lain",
];

export default function TemplateSurat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"list" | "editor">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", content: "" });
  const [editorTab, setEditorTab] = useState("edit");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["letter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("letter_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nama template wajib diisi");
      if (!form.content.trim()) throw new Error("Isi template wajib diisi");

      if (editingId) {
        const { error } = await supabase
          .from("letter_templates")
          .update({ name: form.name, category: form.category || null, content: form.content })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("letter_templates")
          .insert({
            name: form.name,
            category: form.category || null,
            content: form.content,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["letter-templates"] });
      toast.success(editingId ? "Template berhasil diperbarui" : "Template berhasil dibuat");
      backToList();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("letter_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["letter-templates"] });
      toast.success("Template berhasil dihapus");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", category: "", content: "" });
    setEditorTab("edit");
    setMode("editor");
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({ name: t.name, category: t.category || "", content: t.content });
    setEditorTab("edit");
    setMode("editor");
  };

  const backToList = () => {
    setMode("list");
    setEditingId(null);
  };

  if (mode === "editor") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={backToList}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {editingId ? "Edit Template" : "Buat Template Baru"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Tulis template dan sisipkan field dinamis
            </p>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nama Template</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Surat Undangan Rapat"
            />
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs: Editor & Preview */}
        <Tabs value={editorTab} onValueChange={setEditorTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="edit" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview A4
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Buat Template"}
            </Button>
          </div>

          <TabsContent value="edit" className="mt-3">
            <LetterEditor
              content={form.content}
              onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-3">
            <LetterPreview content={form.content} templateName={form.name} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // List mode
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Template Surat</h1>
        <p className="text-muted-foreground mt-1">Kelola template surat dengan editor WYSIWYG dan field dinamis.</p>
      </div>

      <DataTable
        data={templates}
        isLoading={isLoading}
        searchPlaceholder="Cari template..."
        searchKeys={["name", "category"]}
        onAdd={openNew}
        addLabel="Buat Template"
        columns={[
          { key: "name", label: "Nama Template" },
          {
            key: "category",
            label: "Kategori",
            render: (row) => row.category ? (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {row.category}
              </Badge>
            ) : <span className="text-muted-foreground">-</span>,
          },
          {
            key: "created_at",
            label: "Dibuat",
            render: (row) => new Date(row.created_at).toLocaleDateString("id-ID", {
              day: "numeric", month: "short", year: "numeric",
            }),
          },
        ]}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template yang dihapus tidak bisa dikembalikan. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { DispositionThread } from "@/components/DispositionThread";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { Enums } from "@/integrations/supabase/types";

type Status = Enums<"document_status">;

const statusColors: Record<Status, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  confirm: "bg-green-100 text-green-800",
};
const statusLabels: Record<Status, string> = {
  draft: "Draft",
  confirm: "Dikonfirmasi",
};

export default function InboxInternal() {
  const { profile, roles } = useAuth();
  const [detailId, setDetailId] = useState<string | null>(null);
  const isSuperAdmin = roles.includes("super_admin");

  const { data: orgUnits = [] } = useQuery({
    queryKey: ["org-units"],
    queryFn: async () => {
      const [divRes, dirRes] = await Promise.all([
        supabase.from("divisions").select("id, name").order("name"),
        supabase.from("directorates").select("id, name").order("name"),
      ]);
      const map: Record<string, string> = {};
      (dirRes.data || []).forEach(d => { map[d.id] = d.name; });
      (divRes.data || []).forEach(d => { map[d.id] = d.name; });
      return map;
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inbox-internal", profile?.division_id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surat_internal")
        .select("*")
        .eq("status", "confirm")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (isSuperAdmin) return data;
      // Filter client-side: division_id in tujuan array
      return data.filter(s => {
        const tujuan = s.tujuan as string[];
        return profile?.division_id && tujuan.includes(profile.division_id);
      });
    },
    enabled: !!profile,
  });

  const detail = items.find(s => s.id === detailId);

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
            <Badge className={statusColors[detail.status as Status]}>{statusLabels[detail.status as Status]}</Badge>
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
                  <Badge key={id} variant="secondary" className="text-xs">{orgUnits[id] || id}</Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal:</span>
              <p className="font-medium">{format(new Date(detail.created_at), "dd MMMM yyyy", { locale: idLocale })}</p>
            </div>
          </div>
          {detail.isi_surat && (
            <div className="text-sm">
              <span className="text-muted-foreground">Isi Surat:</span>
              <div className="mt-1 p-3 bg-muted/30 rounded border prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: detail.isi_surat }} />
            </div>
          )}
        </div>
        <DispositionThread suratInternalId={detail.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Surat Masuk Internal</h1>
        <p className="text-muted-foreground mt-1">Surat internal yang ditujukan ke divisi Anda.</p>
      </div>
      <DataTable
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Cari surat masuk internal..."
        searchKeys={["nama_surat", "nomor_surat", "perihal"]}
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
    </div>
  );
}

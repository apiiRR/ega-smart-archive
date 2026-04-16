import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DispositionThread } from "@/components/DispositionThread";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { ArrowRight, ArrowLeft, Clock, Upload, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DispositionRow {
  id: string;
  catatan: string;
  created_at: string;
  from_user_id: string;
  to_division_id: string;
  to_user_id: string | null;
  parent_id: string | null;
  surat_masuk_id: string | null;
  surat_keluar_id: string | null;
  surat_internal_id: string | null;
}

interface LetterDetails {
  type: string;
  id: string;
  nama_surat: string;
  nomor_surat: string;
  perihal?: string;
  asal_surat?: string;
  tujuan?: string;
  catatan?: string;
  file_url?: string;
  created_at: string;
}

export default function Disposisi() {
  const { user } = useAuth();
  const [selectedDisposition, setSelectedDisposition] = useState<DispositionRow | null>(null);

  const { data: dispositions = [], isLoading } = useQuery({
    queryKey: ["all-dispositions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("dispositions")
        .select("*")
        .neq("from_user_id", user.id)
        .is("parent_id", null) // Only root dispositions
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DispositionRow[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]));
  const divisionMap = Object.fromEntries(divisions.map((d) => [d.id, d.name]));

  // Fetch letter details for selected disposition
  const { data: letterDetails } = useQuery({
    queryKey: ["disposition-letter", selectedDisposition?.id],
    enabled: !!selectedDisposition,
    queryFn: async () => {
      if (!selectedDisposition) return null;
      const { data, error } = await supabase.rpc("get_disposition_letter_details", {
        _disposition_id: selectedDisposition.id,
      });
      if (error) throw error;
      return (data as unknown as LetterDetails) || null;
    },
  });

  const openDocument = async (fileUrl: string) => {
    const { data, error } = await supabase.storage
      .from("letter-attachments")
      .createSignedUrl(fileUrl, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Gagal membuka dokumen");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "surat_masuk": return "Surat Masuk";
      case "surat_keluar": return "Surat Keluar";
      case "surat_internal": return "Surat Internal";
      default: return type;
    }
  };

  // Detail view
  if (selectedDisposition) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDisposition(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        {/* Letter details */}
        {letterDetails && letterDetails.id && (
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <Badge variant="secondary">{getTypeLabel(letterDetails.type)}</Badge>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{letterDetails.nama_surat}</h2>
              <p className="text-sm text-muted-foreground">No: {letterDetails.nomor_surat}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {letterDetails.perihal && (
                <div>
                  <span className="text-muted-foreground">Perihal:</span>
                  <p className="font-medium">{letterDetails.perihal}</p>
                </div>
              )}
              {letterDetails.asal_surat && (
                <div>
                  <span className="text-muted-foreground">Asal Surat:</span>
                  <p className="font-medium">{letterDetails.asal_surat}</p>
                </div>
              )}
              {letterDetails.tujuan && (
                <div>
                  <span className="text-muted-foreground">Tujuan:</span>
                  <p className="font-medium">{letterDetails.tujuan}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Tanggal:</span>
                <p className="font-medium">
                  {format(new Date(letterDetails.created_at), "dd MMMM yyyy", { locale: idLocale })}
                </p>
              </div>
            </div>

            {letterDetails.catatan && (
              <div className="text-sm">
                <span className="text-muted-foreground">Catatan:</span>
                <p className="mt-1">{letterDetails.catatan}</p>
              </div>
            )}

            {letterDetails.file_url && (
              <Button
                variant="link"
                className="text-sm text-primary p-0 h-auto inline-flex items-center gap-1"
                onClick={() => openDocument(letterDetails.file_url!)}
              >
                <Upload className="h-3 w-3" /> Lihat Dokumen
              </Button>
            )}
          </div>
        )}

        {/* Disposition thread */}
        <DispositionThread
          suratMasukId={selectedDisposition.surat_masuk_id || undefined}
          suratKeluarId={selectedDisposition.surat_keluar_id || undefined}
          suratInternalId={selectedDisposition.surat_internal_id || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Disposisi</h1>
        <p className="text-muted-foreground">Daftar disposisi yang ditujukan kepada Anda</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat data...</p>
      ) : dispositions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Belum ada disposisi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dispositions.map((d) => (
            <Card
              key={d.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedDisposition(d)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="font-semibold text-foreground">
                        {profileMap[d.from_user_id] || "Unknown"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-primary font-medium">
                        {divisionMap[d.to_division_id] || "Unknown"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-2">{d.catatan}</p>
                    <div className="flex gap-2 mt-2">
                      {d.surat_masuk_id && <Badge variant="secondary" className="text-xs">Surat Masuk</Badge>}
                      {d.surat_keluar_id && <Badge variant="secondary" className="text-xs">Surat Keluar</Badge>}
                      {d.surat_internal_id && <Badge variant="secondary" className="text-xs">Surat Internal</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {format(new Date(d.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

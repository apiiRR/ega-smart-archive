import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";

interface DispositionThreadProps {
  suratMasukId?: string;
  suratKeluarId?: string;
  suratInternalId?: string;
}

interface Disposition {
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
  status: "draft" | "confirm";
}

export function DispositionThread({ suratMasukId, suratKeluarId, suratInternalId }: DispositionThreadProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [catatan, setCatatan] = useState("");
  const [toDivisionId, setToDivisionId] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name").order("name");
      if (error) throw error;
      return data;
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

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name]));
  const divisionMap = Object.fromEntries(divisions.map(d => [d.id, d.name]));

  const queryKey = ["dispositions", suratMasukId, suratKeluarId, suratInternalId];
  const { data: dispositions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from("dispositions").select("*").order("created_at", { ascending: true });
      if (suratMasukId) q = q.eq("surat_masuk_id", suratMasukId);
      if (suratKeluarId) q = q.eq("surat_keluar_id", suratKeluarId);
      if (suratInternalId) q = q.eq("surat_internal_id", suratInternalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Disposition[];
    },
  });

  const sendDisposition = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = {
        catatan,
        from_user_id: user.id,
        to_division_id: toDivisionId,
        parent_id: replyTo,
      };
      if (suratMasukId) payload.surat_masuk_id = suratMasukId;
      if (suratKeluarId) payload.surat_keluar_id = suratKeluarId;
      if (suratInternalId) payload.surat_internal_id = suratInternalId;
      const { error } = await supabase.from("dispositions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Disposisi berhasil dikirim");
      setCatatan("");
      setToDivisionId("");
      setReplyTo(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmDisposition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dispositions").update({ status: "confirm" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Disposisi dikonfirmasi");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Build thread: root dispositions and their replies
  const roots = dispositions.filter(d => !d.parent_id);
  const replies = dispositions.filter(d => d.parent_id);
  const replyMap = new Map<string, Disposition[]>();
  replies.forEach(r => {
    const arr = replyMap.get(r.parent_id!) || [];
    arr.push(r);
    replyMap.set(r.parent_id!, arr);
  });

  const renderDisposition = (d: Disposition, isReply = false) => (
    <div key={d.id} className={`p-4 rounded-lg border ${isReply ? "ml-8 bg-muted/30" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="font-semibold text-foreground">{profileMap[d.from_user_id] || "Unknown"}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-primary font-medium">{divisionMap[d.to_division_id] || "Unknown"}</span>
            <Badge className={d.status === "confirm" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
              {d.status === "confirm" ? "Dikonfirmasi" : "Draft"}
            </Badge>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.catatan}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Clock className="h-3 w-3" />
          {format(new Date(d.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {!isReply && d.status === "confirm" && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setReplyTo(d.id)}>
            <MessageSquare className="h-3 w-3 mr-1" /> Balas
          </Button>
        )}
        {d.status === "draft" && d.from_user_id === user?.id && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => confirmDisposition.mutate(d.id)}
            disabled={confirmDisposition.isPending}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Konfirmasi
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Disposisi
      </h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat disposisi...</p>
      ) : dispositions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada disposisi.</p>
      ) : (
        <div className="space-y-3">
          {roots.map(root => (
            <div key={root.id} className="space-y-2">
              {renderDisposition(root)}
              {(replyMap.get(root.id) || []).map(r => renderDisposition(r, true))}
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
        <p className="text-sm font-medium text-foreground">
          {replyTo ? "Balas Disposisi" : "Kirim Disposisi Baru"}
          {replyTo && (
            <Button variant="link" size="sm" className="ml-2 text-xs p-0 h-auto" onClick={() => setReplyTo(null)}>
              Batal balas
            </Button>
          )}
        </p>
        <div className="space-y-2">
          <Label>Tujuan Divisi</Label>
          <Select value={toDivisionId} onValueChange={setToDivisionId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih divisi tujuan" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Catatan</Label>
          <Textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Tulis catatan disposisi..."
            rows={3}
          />
        </div>
        <Button
          onClick={() => sendDisposition.mutate()}
          disabled={!catatan.trim() || !toDivisionId || sendDisposition.isPending}
          size="sm"
        >
          <Send className="h-4 w-4 mr-1" />
          {sendDisposition.isPending ? "Mengirim..." : "Kirim Disposisi"}
        </Button>
      </div>
    </div>
  );
}

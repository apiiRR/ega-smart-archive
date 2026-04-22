import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, ArrowRight, Clock, Forward, CornerUpLeft, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";

interface DispositionThreadProps {
  suratMasukId?: string;
  suratKeluarId?: string;
  suratInternalId?: string;
  /** ID pembuat surat asli */
  letterCreatorUserId?: string;
  /** Divisi pembuat surat asli */
  letterCreatorDivisionId?: string;
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
}

type TargetType = "divisi" | "direksi";
type Mode = { kind: "compose" } | { kind: "reply"; parentId: string; toUserId: string } | { kind: "forward"; parentId: string };

const DIREKSI_DIVISION_NAME = "Direksi";

export function DispositionThread({
  suratMasukId,
  suratKeluarId,
  suratInternalId,
  letterCreatorUserId,
  letterCreatorDivisionId,
}: DispositionThreadProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [catatan, setCatatan] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("divisi");
  const [toDivisionId, setToDivisionId] = useState("");
  const [toDirekturUserId, setToDirekturUserId] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "compose" });

  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-with-division"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, division_id");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p.name])), [profiles]);
  const divisionMap = useMemo(() => Object.fromEntries(divisions.map(d => [d.id, d.name])), [divisions]);

  const direksiDivision = useMemo(
    () => divisions.find(d => d.name?.toLowerCase() === DIREKSI_DIVISION_NAME.toLowerCase()),
    [divisions]
  );
  const direkturList = useMemo(
    () => profiles.filter(p => direksiDivision && p.division_id === direksiDivision.id && p.id !== user?.id),
    [profiles, direksiDivision, user?.id]
  );

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

  const { data: senderProfile } = useQuery({
    queryKey: ["sender-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("division_id").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setCatatan("");
    setToDivisionId("");
    setToDirekturUserId("");
    setTargetType("divisi");
    setMode({ kind: "compose" });
  };

  const sendDisposition = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let targetDivisionId: string | null = null;
      let targetUserId: string | null = null;
      let parentId: string | null = null;

      if (mode.kind === "reply") {
        // Balas ke pengirim disposisi sebelumnya
        targetUserId = mode.toUserId;
        const replyToProfile = profiles.find(p => p.id === mode.toUserId);
        targetDivisionId =
          replyToProfile?.division_id ||
          letterCreatorDivisionId ||
          senderProfile?.division_id ||
          null;
        parentId = mode.parentId;
      } else if (mode.kind === "forward" || mode.kind === "compose") {
        if (targetType === "direksi") {
          if (!toDirekturUserId) throw new Error("Pilih direktur tujuan");
          targetUserId = toDirekturUserId;
          targetDivisionId = direksiDivision?.id || null;
        } else {
          if (!toDivisionId) throw new Error("Pilih divisi tujuan");
          targetDivisionId = toDivisionId;
          targetUserId = null;
        }
        parentId = mode.kind === "forward" ? mode.parentId : null;
      }

      if (!targetDivisionId) throw new Error("Tujuan divisi tidak ditemukan");

      const payload: any = {
        catatan,
        from_user_id: user.id,
        to_division_id: targetDivisionId,
        to_user_id: targetUserId,
        parent_id: parentId,
        status: "confirm",
      };
      if (suratMasukId) payload.surat_masuk_id = suratMasukId;
      if (suratKeluarId) payload.surat_keluar_id = suratKeluarId;
      if (suratInternalId) payload.surat_internal_id = suratInternalId;

      const { error } = await supabase.from("dispositions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["all-dispositions"] });
      toast.success(
        mode.kind === "reply"
          ? "Balasan disposisi terkirim"
          : mode.kind === "forward"
          ? "Disposisi diteruskan"
          : "Disposisi berhasil dikirim"
      );
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengirim disposisi"),
  });

  // Build thread
  const roots = dispositions.filter(d => !d.parent_id);
  const replies = dispositions.filter(d => d.parent_id);
  const replyMap = new Map<string, Disposition[]>();
  replies.forEach(r => {
    const arr = replyMap.get(r.parent_id!) || [];
    arr.push(r);
    replyMap.set(r.parent_id!, arr);
  });

  // User boleh aksi (balas/teruskan) jika disposisi ditujukan ke dirinya atau divisinya
  const canActOn = (d: Disposition) => {
    if (!user) return false;
    if (d.from_user_id === user.id) return false;
    if (d.to_user_id === user.id) return true;
    if (senderProfile?.division_id && d.to_division_id === senderProfile.division_id) return true;
    return false;
  };

  const startReply = (d: Disposition) => {
    setMode({ kind: "reply", parentId: d.id, toUserId: d.from_user_id });
    setCatatan("");
  };
  const startForward = (d: Disposition, type: TargetType) => {
    setMode({ kind: "forward", parentId: d.id });
    setTargetType(type);
    setToDivisionId("");
    setToDirekturUserId("");
    setCatatan("");
  };

  const renderDisposition = (d: Disposition, isReply = false) => (
    <div key={d.id} className={`p-4 rounded-lg border ${isReply ? "ml-8 bg-muted/30" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
            <span className="font-semibold text-foreground">{profileMap[d.from_user_id] || "Unknown"}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-primary font-medium">
              {d.to_user_id ? (profileMap[d.to_user_id] || "Unknown") : (divisionMap[d.to_division_id] || "Unknown")}
            </span>
            {d.to_user_id && (
              <span className="text-xs text-muted-foreground">({divisionMap[d.to_division_id] || "-"})</span>
            )}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.catatan}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Clock className="h-3 w-3" />
          {format(new Date(d.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
        </div>
      </div>
      {canActOn(d) && (
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startReply(d)}>
            <CornerUpLeft className="h-3 w-3 mr-1" /> Balas
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startForward(d, "divisi")}>
            <Building2 className="h-3 w-3 mr-1" /> Teruskan ke Divisi
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startForward(d, "direksi")}>
            <Users className="h-3 w-3 mr-1" /> Teruskan ke Direksi
          </Button>
        </div>
      )}
    </div>
  );

  // Form ditampilkan jika: pembuat surat (compose root), atau sedang reply/forward
  const isCreator = letterCreatorUserId && user?.id === letterCreatorUserId;
  const showForm = isCreator || mode.kind !== "compose" || !letterCreatorUserId;

  const replyTargetName =
    mode.kind === "reply" ? profileMap[mode.toUserId] || "pengirim disposisi" : "";

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

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">
              {mode.kind === "reply"
                ? "Balas Disposisi"
                : mode.kind === "forward"
                ? "Teruskan Disposisi"
                : "Kirim Disposisi Baru"}
            </p>
            {mode.kind !== "compose" && (
              <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={resetForm}>
                Batal
              </Button>
            )}
          </div>

          {mode.kind === "reply" ? (
            <p className="text-xs text-muted-foreground">
              Balasan akan dikirim ke: <span className="font-medium text-foreground">{replyTargetName}</span>
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tipe Tujuan</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divisi">Divisi</SelectItem>
                    <SelectItem value="direksi">Direksi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "divisi" ? (
                <div className="space-y-2">
                  <Label>Divisi Tujuan</Label>
                  <Select value={toDivisionId} onValueChange={setToDivisionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih divisi tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions
                        .filter(d => d.name?.toLowerCase() !== DIREKSI_DIVISION_NAME.toLowerCase())
                        .map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Direktur Tujuan</Label>
                  <Select value={toDirekturUserId} onValueChange={setToDirekturUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder={direkturList.length ? "Pilih direktur" : "Belum ada direktur di divisi Direksi"} />
                    </SelectTrigger>
                    <SelectContent>
                      {direkturList.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!direksiDivision && (
                    <p className="text-xs text-destructive">Divisi "Direksi" belum tersedia. Hubungi admin.</p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder={
                mode.kind === "reply"
                  ? "Tulis balasan..."
                  : mode.kind === "forward"
                  ? "Tulis catatan untuk diteruskan..."
                  : "Tulis catatan disposisi..."
              }
              rows={3}
            />
          </div>

          <Button
            onClick={() => sendDisposition.mutate()}
            disabled={
              !catatan.trim() ||
              sendDisposition.isPending ||
              (mode.kind !== "reply" && targetType === "divisi" && !toDivisionId) ||
              (mode.kind !== "reply" && targetType === "direksi" && !toDirekturUserId)
            }
            size="sm"
          >
            {mode.kind === "forward" ? <Forward className="h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            {sendDisposition.isPending
              ? "Mengirim..."
              : mode.kind === "reply"
              ? "Kirim Balasan"
              : mode.kind === "forward"
              ? "Teruskan"
              : "Kirim Disposisi"}
          </Button>
        </div>
      )}
    </div>
  );
}

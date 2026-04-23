import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Sidebar badge counts.
 *
 * - Buat Surat (surat_masuk/keluar/internal) → disposisi belum dibaca
 *   pada surat yang DIBUAT user.
 * - Disposisi → disposisi yang ditujukan ke user/divisinya, belum dibaca,
 *   bukan miliknya.
 * - Inbox Internal → surat internal `confirm` yang menyertakan divisi user
 *   pada `tujuan` dan belum dibuka.
 * - Inbox Tebusan → idem, untuk `tebusan`.
 */
export function useSidebarCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sidebar-counts", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const result = {
        surat_masuk: 0,
        surat_keluar: 0,
        surat_internal: 0,
        disposisi: 0,
        inbox_internal: 0,
        inbox_tebusan: 0,
      };
      if (!user) return result;

      const [smOwn, skOwn, siOwn] = await Promise.all([
        supabase.from("surat_masuk").select("id").eq("created_by", user.id),
        supabase.from("surat_keluar").select("id").eq("created_by", user.id),
        supabase.from("surat_internal").select("id").eq("created_by", user.id),
      ]);
      const smIds = (smOwn.data ?? []).map(r => r.id);
      const skIds = (skOwn.data ?? []).map(r => r.id);
      const siIds = (siOwn.data ?? []).map(r => r.id);

      const { data: allDisp } = await supabase
        .from("dispositions")
        .select("id, from_user_id, to_user_id, to_division_id, surat_masuk_id, surat_keluar_id, surat_internal_id");

      const { data: reads } = await supabase
        .from("disposition_reads")
        .select("disposition_id")
        .eq("user_id", user.id);
      const readSet = new Set((reads ?? []).map(r => r.disposition_id));

      const { data: profile } = await supabase
        .from("profiles")
        .select("division_id")
        .eq("id", user.id)
        .maybeSingle();
      const myDivisionId = profile?.division_id ?? null;

      for (const d of allDisp ?? []) {
        if (d.from_user_id === user.id) continue;
        if (readSet.has(d.id)) continue;

        if (d.surat_masuk_id && smIds.includes(d.surat_masuk_id)) {
          result.surat_masuk += 1;
          continue;
        }
        if (d.surat_keluar_id && skIds.includes(d.surat_keluar_id)) {
          result.surat_keluar += 1;
          continue;
        }
        if (d.surat_internal_id && siIds.includes(d.surat_internal_id)) {
          result.surat_internal += 1;
          continue;
        }

        const targetedToMe =
          d.to_user_id === user.id ||
          (myDivisionId && d.to_division_id === myDivisionId);
        if (targetedToMe) {
          result.disposisi += 1;
        }
      }

      // Inbox internal & tebusan unread counts
      if (myDivisionId) {
        const { data: surats } = await supabase
          .from("surat_internal")
          .select("id, tujuan, tebusan, created_by")
          .eq("status", "confirm");

        const { data: letterReads } = await supabase
          .from("letter_reads")
          .select("surat_internal_id, read_type")
          .eq("user_id", user.id);
        const readInbox = new Set(
          (letterReads ?? []).filter(r => r.read_type === "inbox").map(r => r.surat_internal_id)
        );
        const readTebusan = new Set(
          (letterReads ?? []).filter(r => r.read_type === "tebusan").map(r => r.surat_internal_id)
        );

        for (const s of surats ?? []) {
          if (s.created_by === user.id) continue;
          const tujuan = Array.isArray(s.tujuan) ? (s.tujuan as string[]) : [];
          const tebusan = Array.isArray(s.tebusan) ? (s.tebusan as string[]) : [];
          if (tujuan.includes(myDivisionId) && !readInbox.has(s.id)) {
            result.inbox_internal += 1;
          }
          if (tebusan.includes(myDivisionId) && !readTebusan.has(s.id)) {
            result.inbox_tebusan += 1;
          }
        }
      }

      return result;
    },
  });
}

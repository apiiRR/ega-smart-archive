import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Sidebar badge counts.
 *
 * Aturan:
 * - Menu "Disposisi" → jumlah disposisi yang DITUJUKAN ke user (atau divisinya)
 *   dan belum dibaca. Tidak termasuk disposisi pada surat yang ia buat sendiri
 *   (itu masuk ke menu Buat Surat).
 * - Menu "Surat Masuk / Keluar / Internal" → jumlah disposisi/balasan baru
 *   pada surat yang DIBUAT oleh user (creator) yang belum ia baca. Ini
 *   memberitahu pembuat surat bahwa ada aktivitas/balasan disposisi pada
 *   suratnya.
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
      };
      if (!user) return result;

      // Ambil id surat yang dibuat oleh user di tiap modul (untuk badge "Buat Surat")
      const [smOwn, skOwn, siOwn] = await Promise.all([
        supabase.from("surat_masuk").select("id").eq("created_by", user.id),
        supabase.from("surat_keluar").select("id").eq("created_by", user.id),
        supabase.from("surat_internal").select("id").eq("created_by", user.id),
      ]);
      const smIds = (smOwn.data ?? []).map(r => r.id);
      const skIds = (skOwn.data ?? []).map(r => r.id);
      const siIds = (siOwn.data ?? []).map(r => r.id);

      // Ambil semua disposisi yang relevan (RLS akan memfilter)
      // Kita butuh: disposisi pada surat milik user (untuk badge buat-surat)
      //            + disposisi yang ditujukan ke user / divisinya (untuk badge disposisi)
      const { data: allDisp } = await supabase
        .from("dispositions")
        .select("id, from_user_id, to_user_id, to_division_id, surat_masuk_id, surat_keluar_id, surat_internal_id");

      // Ambil daftar disposition yang sudah dibaca user
      const { data: reads } = await supabase
        .from("disposition_reads")
        .select("disposition_id")
        .eq("user_id", user.id);
      const readSet = new Set((reads ?? []).map(r => r.disposition_id));

      // Ambil division_id user untuk filter "ditujukan ke divisi saya"
      const { data: profile } = await supabase
        .from("profiles")
        .select("division_id")
        .eq("id", user.id)
        .maybeSingle();
      const myDivisionId = profile?.division_id ?? null;

      for (const d of allDisp ?? []) {
        if (d.from_user_id === user.id) continue; // jangan hitung disposisi sendiri
        if (readSet.has(d.id)) continue;

        // Badge untuk pembuat surat (menu Buat Surat)
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

        // Badge disposisi (untuk penerima yang bukan pembuat surat)
        const targetedToMe =
          d.to_user_id === user.id ||
          (myDivisionId && d.to_division_id === myDivisionId);
        if (targetedToMe) {
          result.disposisi += 1;
        }
      }

      return result;
    },
  });
}

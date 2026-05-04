import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LetterType = "surat_masuk" | "surat_keluar" | "surat_internal";

/**
 * Untuk pembuat surat: hitung jumlah disposisi yang belum dibaca per surat.
 * Mengembalikan Map<letterId, count>.
 */
export function useLetterUnreadDispositions(letterType: LetterType, letterIds: string[]) {
  const { user } = useAuth();
  const ids = [...letterIds].sort();

  return useQuery({
    queryKey: ["letter-unread-disp", letterType, user?.id, ids.join(",")],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const map = new Map<string, number>();
      if (!user || ids.length === 0) return map;

      const col =
        letterType === "surat_masuk"
          ? "surat_masuk_id"
          : letterType === "surat_keluar"
          ? "surat_keluar_id"
          : "surat_internal_id";

      const { data: disps } = await supabase
        .from("dispositions")
        .select(`id, from_user_id, ${col}`)
        .in(col, ids);

      const dispIds = (disps ?? []).map((d: any) => d.id);
      const { data: reads } = await supabase
        .from("disposition_reads")
        .select("disposition_id")
        .eq("user_id", user.id)
        .in("disposition_id", dispIds.length ? dispIds : ["00000000-0000-0000-0000-000000000000"]);
      const readSet = new Set((reads ?? []).map(r => r.disposition_id));

      for (const d of (disps ?? []) as any[]) {
        if (d.from_user_id === user.id) continue;
        if (readSet.has(d.id)) continue;
        const lid = d[col] as string;
        map.set(lid, (map.get(lid) ?? 0) + 1);
      }
      return map;
    },
  });
}

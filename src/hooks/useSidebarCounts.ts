import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSidebarCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sidebar-counts", user?.id],
    enabled: !!user,
    refetchInterval: 30000, // refresh every 30s
    queryFn: async () => {
      const [masukRes, keluarRes, internalRes, disposisiRes] = await Promise.all([
        supabase.from("surat_masuk").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("surat_keluar").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("surat_internal").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("dispositions").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);

      return {
        surat_masuk: masukRes.count ?? 0,
        surat_keluar: keluarRes.count ?? 0,
        surat_internal: internalRes.count ?? 0,
        disposisi: disposisiRes.count ?? 0,
      };
    },
  });
}

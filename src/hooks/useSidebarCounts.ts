import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSidebarCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sidebar-counts", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      // All letters and dispositions now save directly as confirmed,
      // so no draft counts are needed anymore.
      return {
        surat_masuk: 0,
        surat_keluar: 0,
        surat_internal: 0,
        disposisi: 0,
      };
    },
  });
}

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
      let disposisi = 0;
      if (user) {
        const { data, error } = await supabase.rpc("count_unread_dispositions", {
          _user_id: user.id,
        });
        if (!error && typeof data === "number") disposisi = data;
      }
      return {
        surat_masuk: 0,
        surat_keluar: 0,
        surat_internal: 0,
        disposisi,
      };
    },
  });
}

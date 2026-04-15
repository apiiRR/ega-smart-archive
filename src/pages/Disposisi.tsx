import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { ArrowRight, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

export default function Disposisi() {
  const { user } = useAuth();

  const { data: dispositions = [], isLoading } = useQuery({
    queryKey: ["all-dispositions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      // Only show dispositions addressed TO the current user, not ones they created
      const { data, error } = await supabase
        .from("dispositions")
        .select("*")
        .neq("from_user_id", user.id)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Disposisi</h1>
        <p className="text-muted-foreground">Daftar semua disposisi surat</p>
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
            <Card key={d.id}>
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
                      {d.parent_id && (
                        <Badge variant="outline" className="text-xs">Balasan</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{d.catatan}</p>
                    <div className="flex gap-2 mt-2">
                      {d.surat_masuk_id && (
                        <Badge variant="secondary" className="text-xs">Surat Masuk</Badge>
                      )}
                      {d.surat_keluar_id && (
                        <Badge variant="secondary" className="text-xs">Surat Keluar</Badge>
                      )}
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

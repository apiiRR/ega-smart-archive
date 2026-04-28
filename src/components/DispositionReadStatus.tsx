import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Check, Clock, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReadRow {
  user_id: string;
  name: string;
  division_id: string | null;
  division_name: string | null;
  read_at: string | null;
}

export function DispositionReadStatus({ dispositionId }: { dispositionId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["disposition-read-status", dispositionId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_disposition_read_status", {
        _disposition_id: dispositionId,
      });
      if (error) throw error;
      return ((data as unknown) as ReadRow[]) || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat status baca...</p>;
  if (data.length === 0) return null;

  const readCount = data.filter((r) => r.read_at).length;

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Status Baca Penerima</h3>
        </div>
        <Badge variant="secondary">
          {readCount}/{data.length} dibaca
        </Badge>
      </div>
      <div className="space-y-2">
        {data.map((r) => (
          <div
            key={r.user_id}
            className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{r.name}</p>
              {r.division_name && (
                <p className="text-xs text-muted-foreground">{r.division_name}</p>
              )}
            </div>
            {r.read_at ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600 whitespace-nowrap">
                <Check className="h-3.5 w-3.5" />
                <span>{format(new Date(r.read_at), "dd MMM yyyy HH:mm", { locale: idLocale })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                <EyeOff className="h-3.5 w-3.5" />
                <span>Belum dibaca</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

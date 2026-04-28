import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Check, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReadStatusRow {
  division_id: string;
  division_name: string | null;
  recipient_type: "tujuan" | "tebusan";
  total_users: number;
  read_users: number;
  first_read_at: string | null;
  last_read_at: string | null;
}

export function SuratInternalReadStatus({ suratId }: { suratId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["surat-internal-read-status", suratId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_surat_internal_read_status", {
        _surat_id: suratId,
      });
      if (error) throw error;
      return ((data as unknown) as ReadStatusRow[]) || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat status baca...</p>;
  if (data.length === 0) return null;

  const tujuan = data.filter((d) => d.recipient_type === "tujuan");
  const tebusan = data.filter((d) => d.recipient_type === "tebusan");

  const renderGroup = (title: string, rows: ReadStatusRow[]) => {
    if (rows.length === 0) return null;
    const totalRead = rows.filter((r) => r.read_users > 0).length;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          <Badge variant="outline" className="text-xs">
            {totalRead}/{rows.length} divisi
          </Badge>
        </div>
        <div className="space-y-2">
          {rows.map((r) => {
            const isRead = r.read_users > 0;
            return (
              <div
                key={`${r.recipient_type}-${r.division_id}`}
                className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.division_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.read_users} dari {r.total_users} pengguna membaca
                  </p>
                </div>
                {isRead && r.first_read_at ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 whitespace-nowrap">
                    <Check className="h-3.5 w-3.5" />
                    <span>
                      {format(new Date(r.first_read_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Belum dibaca</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Status Baca Penerima</h3>
      </div>
      {renderGroup("Tujuan", tujuan)}
      {renderGroup("Tebusan", tebusan)}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TemplateSurat() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["letter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("letter_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Template Surat</h1>
        <p className="text-muted-foreground">Kelola template surat</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat data...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Belum ada template surat.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{t.name}</span>
                </div>
                {t.category && (
                  <p className="text-xs text-muted-foreground">Kategori: {t.category}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

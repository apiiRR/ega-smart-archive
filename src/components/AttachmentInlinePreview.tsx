import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

interface AttachmentInlinePreviewProps {
  filePath: string;
  label?: string;
  heightClass?: string;
}

export function AttachmentInlinePreview({
  filePath,
  label = "Lampiran",
  heightClass = "h-[600px]",
}: AttachmentInlinePreviewProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const isPdf = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase.storage
      .from("letter-attachments")
      .createSignedUrl(filePath, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setError("Gagal memuat lampiran");
        } else {
          setSignedUrl(data.signedUrl);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-card">
        <div className="flex items-center gap-2 min-w-0">
          {isPdf ? (
            <FileText className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        {signedUrl && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => window.open(signedUrl, "_blank")}
              aria-label="Buka di tab baru"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Buka</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              asChild
            >
              <a href={signedUrl} download aria-label="Unduh lampiran">
                <Download className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Unduh</span>
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="bg-background">
        {loading && (
          <div className={`flex items-center justify-center ${heightClass}`}>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <div className={`flex items-center justify-center ${heightClass} text-sm text-destructive`}>
            {error}
          </div>
        )}
        {!loading && !error && signedUrl && (
          <>
            {isImage && (
              <img
                src={signedUrl}
                alt={label}
                className={`${heightClass} w-full object-contain bg-muted`}
              />
            )}
            {isPdf && (
              <iframe
                src={`${signedUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={label}
                className={`w-full ${heightClass} border-0`}
              />
            )}
            {!isImage && !isPdf && (
              <div className={`flex items-center justify-center ${heightClass} text-sm text-muted-foreground`}>
                Pratinjau tidak tersedia. Klik "Buka" untuk melihat file.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_SIZE_MB = 20;

interface FileUploadPreviewProps {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
  helperText?: string;
  previewHeightClass?: string;
}

export function FileUploadPreview({
  label,
  required,
  file,
  onChange,
  helperText = "Hanya PDF atau gambar (JPG, PNG, WEBP, GIF). Maks 20MB.",
  previewHeightClass = "h-56",
}: FileUploadPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (selected: File | null) => {
    if (!selected) {
      onChange(null);
      return;
    }
    const ext = "." + (selected.name.split(".").pop() || "").toLowerCase();
    const isAllowed = ALLOWED_TYPES.includes(selected.type) || ALLOWED_EXTS.includes(ext);
    if (!isAllowed) {
      toast.error("Tipe file tidak diizinkan. Hanya PDF atau gambar.");
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${MAX_SIZE_MB}MB.`);
      return;
    }
    onChange(selected);
  };

  const isPdf = file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf");
  const isImage = file?.type.startsWith("image/");

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      {!file && (
        <>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*"
            onChange={(e) => handleSelect(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-muted-foreground">{helperText}</p>
        </>
      )}

      {file && previewUrl && (
        <div className="border rounded-lg overflow-hidden bg-muted/30">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-card">
            <div className="flex items-center gap-2 min-w-0">
              {isPdf ? (
                <FileText className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <ImageIcon className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                ({(file.size / 1024).toFixed(0)} KB)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onChange(null)}
              aria-label="Hapus file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-background">
            {isImage && (
              <img
                src={previewUrl}
                alt={file.name}
                className={`${previewHeightClass} w-full object-contain bg-muted`}
              />
            )}
            {isPdf && (
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                title={file.name}
                className={`w-full ${previewHeightClass} border-0`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

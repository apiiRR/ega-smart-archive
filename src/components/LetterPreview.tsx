import { ScrollArea } from "@/components/ui/scroll-area";

interface LetterPreviewProps {
  content: string;
  templateName?: string;
}

export function LetterPreview({ content, templateName }: LetterPreviewProps) {
  // Highlight dynamic fields with accent color
  const rendered = content.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="inline-block bg-amber-100 text-amber-800 rounded px-1 text-xs font-mono border border-amber-300">{{$1}}</span>'
  );

  return (
    <ScrollArea className="h-[700px]">
      <div className="flex justify-center p-4 bg-muted/50">
        {/* A4 paper: 210mm x 297mm ratio ≈ 595px x 842px at 72dpi */}
        <div
          className="bg-white shadow-lg border"
          style={{
            width: "595px",
            minHeight: "842px",
            padding: "60px 56px",
            fontFamily: "'Times New Roman', serif",
            fontSize: "12pt",
            lineHeight: "1.5",
            color: "#1a1a1a",
          }}
        >
          {/* Kop Surat */}
          <div className="text-center border-b-2 border-black pb-3 mb-6">
            <h2 className="text-lg font-bold tracking-wide" style={{ fontSize: "16pt" }}>
              PT BERDIKARI (PERSERO)
            </h2>
            <p className="text-xs mt-0.5" style={{ fontSize: "9pt", color: "#444" }}>
              Jl. Veteran III No. 38, Jakarta Pusat 10110
            </p>
            <p className="text-xs" style={{ fontSize: "8pt", color: "#666" }}>
              Telp: (021) 3441508 &bull; Fax: (021) 3441509 &bull; www.bfreer.co.id
            </p>
          </div>

          {/* Body content from editor */}
          <div
            className="prose prose-sm max-w-none"
            style={{ fontSize: "12pt" }}
            dangerouslySetInnerHTML={{ __html: rendered || '<p class="text-gray-400 italic">Isi template akan ditampilkan di sini...</p>' }}
          />

          {/* Footer space for signature */}
          <div className="mt-12" style={{ fontSize: "12pt" }}>
            <div className="text-right">
              <p>Jakarta, {"{{tanggal_surat}}"}</p>
              <div className="mt-16">
                <p className="font-bold">{"{{nama_pengirim}}"}</p>
                <p>{"{{jabatan_pengirim}}"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

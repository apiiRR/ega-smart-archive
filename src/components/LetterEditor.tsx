import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Braces,
} from "lucide-react";
import { useEffect, useCallback } from "react";

const DYNAMIC_FIELDS = [
  { value: "{{nama_penerima}}", label: "Nama Penerima" },
  { value: "{{jabatan_penerima}}", label: "Jabatan Penerima" },
  { value: "{{alamat_penerima}}", label: "Alamat Penerima" },
  { value: "{{nomor_surat}}", label: "Nomor Surat" },
  { value: "{{tanggal_surat}}", label: "Tanggal Surat" },
  { value: "{{perihal}}", label: "Perihal" },
  { value: "{{nama_pengirim}}", label: "Nama Pengirim" },
  { value: "{{jabatan_pengirim}}", label: "Jabatan Pengirim" },
  { value: "{{nip_pengirim}}", label: "NIP Pengirim" },
];

interface LetterEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function LetterEditor({ content, onChange }: LetterEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Tulis isi surat di sini..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content]);

  const insertField = useCallback((field: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(field).run();
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, icon: Icon, tip }: {
    onClick: () => void; active?: boolean; icon: any; tip: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          type="button"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} tip="Bold" />
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} tip="Italic" />
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={UnderlineIcon} tip="Underline" />
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} tip="Strikethrough" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} tip="Rata Kiri" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} tip="Rata Tengah" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} tip="Rata Kanan" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={AlignJustify} tip="Rata Kiri-Kanan" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} tip="Bullet List" />
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} tip="Numbered List" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} icon={Undo2} tip="Undo" />
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} icon={Redo2} tip="Redo" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Select onValueChange={insertField}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <div className="flex items-center gap-1">
              <Braces className="h-3.5 w-3.5" />
              <SelectValue placeholder="Sisipkan field..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {DYNAMIC_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none
          [&_.tiptap]:outline-none [&_.tiptap]:min-h-[380px]
          [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground
          [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
          [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
          [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
          [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}

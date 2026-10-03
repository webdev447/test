"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { uploadArticleImage } from "@/app/actions/articles";

// A WordPress-Post-style editor: type/format text with a small toolbar, and
// drop images in anywhere via the "แทรกรูปภาพ" button — not a markdown
// textarea. Saves as HTML (`editor.getHTML()`), which is exactly what's
// stored in `articles.content` and rendered as-is on the public page.
//
// Uncontrolled by design: `value` only seeds the INITIAL content. The
// parent should pass a `key` (e.g. the article id, or "new") so switching
// between articles remounts this with fresh content instead of fighting
// the editor's own state on every keystroke.
export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapImage.configure({ HTMLAttributes: { class: "rounded-xl" } }),
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[240px] rounded-b-xl border border-t-0 border-border bg-background px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setIsUploading(true);
      try {
        const url = await uploadArticleImage(reader.result as string);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("แทรกรูปภาพไม่สำเร็จ:", err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (!editor) {
    return <div className="mt-1 h-64 rounded-xl border border-border bg-background-soft" />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-border bg-background-card p-2">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("ลิงก์ URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          🔗
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <ToolbarButton onClick={() => fileInputRef.current?.click()}>
          {isUploading ? "กำลังอัปโหลด..." : "🖼️ แทรกรูปภาพ"}
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-gold/15 text-gold-light" : "text-foreground-muted hover:bg-background-soft"
      }`}
    >
      {children}
    </button>
  );
}

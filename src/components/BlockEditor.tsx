"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const getMd = (e: any): string => { try { return e.storage.markdown.getMarkdown(); } catch { return e.getText(); } };

export default function BlockEditor({
  content, onChange, onEmpty, autoFocus = false,
}: {
  content: string; onChange: (md: string) => void; onEmpty: () => void; autoFocus?: boolean;
}) {
  const ext = useRef(false);
  const last = useRef(content);
  const init = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Placeholder.configure({ placeholder: "Write here...", emptyEditorClass: "is-editor-empty" }),
      TaskList, TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Markdown.configure({ html: true, tightLists: true, bulletListMarker: "-", transformPastedText: true, transformCopiedText: true }),
    ],
    content: "",
    editorProps: { attributes: { class: "block-editor" } },
    onUpdate: ({ editor: e }) => {
      if (ext.current) return;
      const md = getMd(e);
      last.current = md;
      onChange(md);
    },
    onBlur: ({ editor: e }) => {
      const md = getMd(e);
      if (!md.trim()) onEmpty();
    },
  });

  // Init
  useEffect(() => {
    if (!editor || init.current) return;
    init.current = true;
    if (content) {
      ext.current = true;
      editor.commands.setContent(content);
      last.current = content;
      ext.current = false;
    }
    if (autoFocus) requestAnimationFrame(() => editor.commands.focus("end"));
  }, [editor, content, autoFocus]);

  // Sync external changes
  useEffect(() => {
    if (!editor || !init.current || content === last.current) return;
    ext.current = true;
    last.current = content;
    editor.commands.setContent(content);
    ext.current = false;
  }, [content, editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

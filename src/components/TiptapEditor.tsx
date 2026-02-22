"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const getMd = (e: any): string => { try { return e.storage.markdown.getMarkdown(); } catch { return e.getText(); } };

export default function TiptapEditor({
  content, onChange, onSelectionChange, placeholder = "Start writing...", autoFocus = false,
}: {
  content: string; onChange: (md: string) => void; onSelectionChange?: (text: string) => void;
  placeholder?: string; autoFocus?: boolean;
}) {
  const ext = useRef(false);
  const last = useRef(content);
  const init = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Placeholder.configure({ placeholder, emptyEditorClass: "is-editor-empty" }),
      TaskList, TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: true, autolink: true }),
      Image.configure({ inline: true, allowBase64: true }),
      Markdown.configure({ html: true, tightLists: true, bulletListMarker: "-", transformPastedText: true, transformCopiedText: true }),
    ],
    content: "",
    editorProps: { attributes: { class: "tiptap-editor" } },
    onUpdate: ({ editor }) => {
      if (ext.current) return;
      const md = getMd(editor);
      last.current = md;
      onChange(md);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionChange) return;
      const { from, to } = editor.state.selection;
      onSelectionChange(from !== to ? editor.state.doc.textBetween(from, to, " ") : "");
    },
  });

  // Init: set markdown after editor ready
  useEffect(() => {
    if (!editor || init.current) return;
    init.current = true;
    if (content) {
      ext.current = true;
      editor.commands.setContent(content);
      last.current = content;
      ext.current = false;
      if (autoFocus) requestAnimationFrame(() => editor.commands.focus("end"));
    } else if (autoFocus) editor.commands.focus();
  }, [editor, content, autoFocus]);

  // Sync external changes (note switch)
  useEffect(() => {
    if (!editor || !init.current || content === last.current) return;
    ext.current = true;
    last.current = content;
    editor.commands.setContent(content);
    ext.current = false;
  }, [content, editor]);

  // Paste images as base64
  useEffect(() => {
    if (!editor) return;
    const h = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file) return;
          const r = new FileReader();
          r.onload = () => editor.chain().focus().setImage({ src: r.result as string }).run();
          r.readAsDataURL(file);
          break;
        }
      }
    };
    editor.view.dom.addEventListener("paste", h);
    return () => editor.view.dom.removeEventListener("paste", h);
  }, [editor]);

  // Expose insert for AI panel
  const insertText = useCallback((text: string) => {
    if (!editor) return;
    const cur = getMd(editor);
    const newContent = cur + (cur.endsWith("\n") || !cur ? "" : "\n\n") + text;
    last.current = newContent;
    editor.commands.setContent(newContent);
    editor.commands.focus("end");
    onChange(newContent);
  }, [editor, onChange]);

  useEffect(() => {
    (window as any).__tiptapInsert = insertText;
    return () => { delete (window as any).__tiptapInsert; };
  }, [insertText]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

export function getTiptapInsert(): ((text: string) => void) | null {
  return (window as any).__tiptapInsert || null;
}

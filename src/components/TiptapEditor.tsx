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

interface Props {
  content: string; // markdown string
  onChange: (markdown: string) => void;
  onSelectionChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

export default function TiptapEditor({
  content,
  onChange,
  onSelectionChange,
  placeholder = "Start writing...",
  className = "",
  editable = true,
  autoFocus = false,
}: Props) {
  const isExternalUpdate = useRef(false);
  const lastContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: {
          HTMLAttributes: { class: "code-block" },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editable,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: `tiptap-editor ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const md = (editor.storage as unknown as Record<string, { getMarkdown: () => string }>).markdown.getMarkdown();
      lastContentRef.current = md;
      onChange(md);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionChange) return;
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, " ");
        onSelectionChange(text);
      } else {
        onSelectionChange("");
      }
    },
  });

  // Sync external content changes (e.g. AI insert, note switch)
  useEffect(() => {
    if (!editor) return;
    if (content === lastContentRef.current) return;

    isExternalUpdate.current = true;
    lastContentRef.current = content;

    // Preserve cursor position when possible
    const { from, to } = editor.state.selection;
    editor.commands.setContent(content);

    // Try to restore cursor
    const docSize = editor.state.doc.content.size;
    const safeFrom = Math.min(from, docSize);
    const safeTo = Math.min(to, docSize);
    try {
      editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
    } catch {
      // If position is invalid, move to end
      editor.commands.setTextSelection(docSize);
    }

    isExternalUpdate.current = false;
  }, [content, editor]);

  // Handle paste images
  useEffect(() => {
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          event.preventDefault();
          const file = items[i].getAsFile();
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            editor.chain().focus().setImage({ src: base64 }).run();
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("paste", handlePaste);
    return () => editorElement.removeEventListener("paste", handlePaste);
  }, [editor]);

  // Expose editor commands via ref-like pattern
  const insertText = useCallback(
    (text: string) => {
      if (!editor) return;
      // Insert markdown at cursor position
      const { from } = editor.state.selection;
      const currentMd = (editor.storage as unknown as Record<string, { getMarkdown: () => string }>).markdown.getMarkdown();
      const lines = currentMd.split("\n");

      // Simple approach: append with separator
      const separator = currentMd.endsWith("\n") || currentMd === "" ? "" : "\n\n";
      const newContent = currentMd + separator + text;
      lastContentRef.current = newContent;
      editor.commands.setContent(newContent);
      // Move cursor to end
      editor.commands.setTextSelection(editor.state.doc.content.size);
      onChange(newContent);
    },
    [editor, onChange]
  );

  // Attach insertText to window for external access
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__tiptapInsert = insertText;
    return () => {
      delete (window as unknown as Record<string, unknown>).__tiptapInsert;
    };
  }, [insertText]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}

// Helper to get editor insert function
export function getTiptapInsert(): ((text: string) => void) | null {
  return ((window as unknown as Record<string, unknown>).__tiptapInsert as (text: string) => void) || null;
}

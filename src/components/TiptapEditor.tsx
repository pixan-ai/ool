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

interface Props {
  content: string; // markdown string
  onChange: (markdown: string) => void;
  onSelectionChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

// Helper to get markdown from editor storage
function getMarkdown(editor: any): string {
  try {
    return editor.storage.markdown.getMarkdown();
  } catch {
    return editor.getText();
  }
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
  const isInitialized = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: {
          HTMLAttributes: { class: "code-block" },
        },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: { class: "tiptap-link" },
      }),
      Image.configure({ inline: true, allowBase64: true }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    // Start empty — we set markdown content in the effect below
    content: "",
    editable,
    autofocus: false,
    editorProps: {
      attributes: {
        class: `tiptap-editor ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const md = getMarkdown(editor);
      lastContentRef.current = md;
      onChange(md);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionChange) return;
      const { from, to } = editor.state.selection;
      if (from !== to) {
        onSelectionChange(editor.state.doc.textBetween(from, to, " "));
      } else {
        onSelectionChange("");
      }
    },
  });

  // Set initial markdown content AFTER editor is created
  // This ensures the Markdown extension is ready to parse
  useEffect(() => {
    if (!editor || isInitialized.current) return;
    isInitialized.current = true;

    if (content) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content);
      lastContentRef.current = content;
      isExternalUpdate.current = false;

      // Auto-focus at end if requested
      if (autoFocus) {
        requestAnimationFrame(() => {
          editor.commands.focus("end");
        });
      }
    } else if (autoFocus) {
      editor.commands.focus();
    }
  }, [editor, content, autoFocus]);

  // Sync external content changes (note switch, AI insert)
  useEffect(() => {
    if (!editor || !isInitialized.current) return;
    if (content === lastContentRef.current) return;

    isExternalUpdate.current = true;
    lastContentRef.current = content;
    editor.commands.setContent(content);
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
            editor.chain().focus().setImage({ src: reader.result as string }).run();
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("paste", handlePaste);
    return () => dom.removeEventListener("paste", handlePaste);
  }, [editor]);

  // Expose insert function for AI panel
  const insertText = useCallback(
    (text: string) => {
      if (!editor) return;
      const currentMd = getMarkdown(editor);
      const separator = currentMd.endsWith("\n") || currentMd === "" ? "" : "\n\n";
      const newContent = currentMd + separator + text;
      lastContentRef.current = newContent;
      editor.commands.setContent(newContent);
      editor.commands.focus("end");
      onChange(newContent);
    },
    [editor, onChange]
  );

  useEffect(() => {
    (window as any).__tiptapInsert = insertText;
    return () => { delete (window as any).__tiptapInsert; };
  }, [insertText]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}

// Helper for external access to insert function
export function getTiptapInsert(): ((text: string) => void) | null {
  return (window as any).__tiptapInsert || null;
}

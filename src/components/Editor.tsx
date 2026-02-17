"use client";

import { useState, useRef, useEffect } from "react";
import { Note } from "@/lib/types";
import MarkdownPreview from "./MarkdownPreview";

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onBack: () => void;
}

type Tab = "edit" | "preview";

export default function Editor({ note, onChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when switching to edit mode or when note changes
  useEffect(() => {
    if (tab === "edit" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [tab, note.id]);

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-[var(--border)]">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--bg-hover)] transition-colors md:hidden"
          aria-label="Back to notes"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Tab switcher */}
        <div className="flex bg-[var(--bg-secondary)] rounded-lg p-0.5 ml-1">
          <button
            onClick={() => setTab("edit")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              tab === "edit"
                ? "bg-[var(--bg-hover)] text-[var(--text)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              tab === "preview"
                ? "bg-[var(--bg-hover)] text-[var(--text)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {tab === "edit" ? (
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing..."
            className="editor-textarea w-full h-full p-4 md:p-6"
            spellCheck={false}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4 md:p-6">
            <MarkdownPreview content={note.content} />
          </div>
        )}
      </div>
    </div>
  );
}

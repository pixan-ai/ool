"use client";

import { Note } from "@/lib/types";
import { getTitle, getPreview, formatDate } from "@/lib/notes";

interface Props {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function NoteList({
  notes,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold tracking-tight">ool</h1>
        <button
          onClick={onNew}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="New note"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-4 py-8 text-center text-[var(--text-secondary)] text-sm">
            No notes yet.
            <br />
            Tap + to create one.
          </div>
        ) : (
          <div className="py-1">
            {notes
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelect(note.id)}
                  className={`
                    group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                    ${
                      note.id === activeId
                        ? "bg-[var(--bg-hover)]"
                        : "hover:bg-[var(--bg-hover)]"
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {getTitle(note)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDate(note.updatedAt)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] truncate">
                        {getPreview(note)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-secondary)] hover:text-[var(--danger)] shrink-0 mt-0.5"
                    aria-label="Delete note"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

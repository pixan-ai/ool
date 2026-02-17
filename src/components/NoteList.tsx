"use client";

import { useState } from "react";
import { Note, NOTE_COLORS } from "@/lib/types";
import { getTitle, getPreview, formatDate, searchNotes } from "@/lib/notes";

interface Props {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function NoteList({ notes, activeId, onSelect, onNew, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const filtered = searchNotes(sorted, query);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="enso" />
          <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--accent)' }}>ool</h1>
        </div>
        <button
          onClick={onNew}
          className="toolbar-btn"
          aria-label="New note"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="search-input"
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-4 py-12 text-center animate-fade-in">
            <div className="enso mx-auto mb-4" style={{ width: 48, height: 48, borderWidth: 2, opacity: 0.2 }} />
            <p className="zen-quote mb-4">
              In the beginner&apos;s mind<br />
              there are many possibilities.
            </p>
            <button
              onClick={onNew}
              className="text-[var(--accent)] text-sm hover:text-[var(--accent-hover)] transition-colors"
            >
              Begin writing
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-sm">
            No notes found
          </div>
        ) : (
          <div className="py-0.5">
            {filtered.map((note, i) => (
              <div
                key={note.id}
                onClick={() => onSelect(note.id)}
                className={`note-item ${note.id === activeId ? 'active bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-secondary)]'} group flex items-start gap-3 px-4 py-2.5 cursor-pointer`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Color dot */}
                <div
                  className="color-dot mt-1.5"
                  style={{ background: NOTE_COLORS[note.color].dot }}
                />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate leading-snug">
                    {getTitle(note)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
                      {formatDate(note.updatedAt)}
                    </span>
                    {getPreview(note) && (
                      <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {getPreview(note)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                  className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)] hover:text-[var(--danger)] shrink-0 mt-0.5"
                  aria-label="Delete note"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {notes.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)] text-center">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

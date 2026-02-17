"use client";

import { useState, useCallback, useRef } from "react";
import { Note, NOTE_COLORS, SortMode } from "@/lib/types";
import { getTitle, getPreview, formatDate, searchNotes, sortNotes, importNote } from "@/lib/notes";

interface Props {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onImport: () => void;
  onThemeToggle: () => void;
  isDarkTheme: boolean;
}

export default function NoteList({
  notes, activeId, onSelect, onNew, onDelete, onPin, onImport, onThemeToggle, isDarkTheme
}: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [showSort, setShowSort] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const sorted = sortNotes(notes, sortMode);
  const filtered = searchNotes(sorted, query);

  const handleCopyContent = useCallback(async (note: Note) => {
    let content = note.content;
    if (note.mode === 'canvas' && note.blocks) {
      content = note.blocks.map(b => b.content).filter(Boolean).join("\n\n---\n\n");
    }
    await navigator.clipboard.writeText(content);
  }, []);

  // Drag & drop .md import
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.md') || f.name.endsWith('.txt') || f.name.endsWith('.markdown')
    );

    if (files.length === 0) return;

    let imported = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        importNote(content);
        imported++;
        if (imported === files.length) {
          onImport();
        }
      };
      reader.readAsText(file);
    });
  }, [onImport]);

  return (
    <div
      className={`flex flex-col h-full ${dragOver ? 'drop-zone-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="enso" />
          <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--accent)' }}>ool</h1>
        </div>
        <div className="flex items-center gap-1">
          {/* Sort */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSort(p => !p)}
              className={`toolbar-btn ${showSort ? 'active' : ''}`}
              aria-label="Sort notes"
              title="Sort"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
            {showSort && (
              <div className="sort-dropdown">
                {([['date', 'By date'], ['title', 'By title'], ['color', 'By color']] as [SortMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => { setSortMode(mode); setShowSort(false); }}
                    className={`sort-option ${sortMode === mode ? 'active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
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
      </div>

      {/* Search */}
      <div className="px-4 py-2">
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
          <div className="px-5 py-12 text-center animate-fade-in">
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
            <p className="text-[11px] text-[var(--text-tertiary)] mt-4">
              or drop .md files here
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-[var(--text-tertiary)] text-sm">
            No notes found
          </div>
        ) : (
          <div className="py-0.5">
            {filtered.map((note, i) => (
              <div
                key={note.id}
                onClick={() => onSelect(note.id)}
                className={`note-item ${note.id === activeId ? 'active bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-secondary)]'} group flex items-start gap-3 px-5 py-2.5 cursor-pointer`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Color dot + pin */}
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div
                    className="color-dot"
                    style={{ background: NOTE_COLORS[note.color].dot }}
                  />
                  {note.pinned && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--accent)" className="pin-icon">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate leading-snug flex items-center gap-1.5">
                    {note.mode === 'canvas' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
                        <rect x="3" y="14" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="7" rx="1" />
                      </svg>
                    )}
                    <span className="truncate">{getTitle(note)}</span>
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

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onPin(note.id); }}
                    className={`flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)] ${note.pinned ? 'text-[var(--accent)]' : ''}`}
                    aria-label={note.pinned ? "Unpin" : "Pin"}
                    title={note.pinned ? "Unpin" : "Pin to top"}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyContent(note); }}
                    className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)]"
                    aria-label="Copy"
                    title="Copy content"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                    aria-label="Delete note"
                    title="Delete"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? 's' : ''}` : ''}
          </span>
          {/* Theme toggle */}
          <button onClick={onThemeToggle} className="theme-toggle" aria-label="Toggle theme" title={isDarkTheme ? "Light mode" : "Dark mode"} />
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <span className="kbd">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

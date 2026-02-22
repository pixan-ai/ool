"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Note, NOTE_COLORS, SortMode } from "@/lib/types";
import { getTitle, getPreview, formatDate, searchNotes, sortNotes, importNote } from "@/lib/notes";

interface Props {
  notes: Note[]; activeId: string | null;
  onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void;
  onPin: (id: string) => void; onImport: () => void; onThemeToggle: () => void; isDarkTheme: boolean;
}

export default function NoteList({ notes, activeId, onSelect, onNew, onDelete, onPin, onImport, onThemeToggle, isDarkTheme }: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("modified");
  const [showSort, setShowSort] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const filtered = searchNotes(sortNotes(notes, sortMode), query);

  useEffect(() => {
    if (!showSort) return;
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSort]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(md|txt|markdown)$/.test(f.name));
    if (!files.length) return;
    let done = 0;
    files.forEach(f => { const r = new FileReader(); r.onload = () => { importNote(r.result as string); if (++done === files.length) onImport(); }; r.readAsText(f); });
  }, [onImport]);

  return (
    <div className={`flex flex-col h-full ${dragOver ? "drop-zone-active" : ""}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
      onDrop={handleDrop}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="enso" />
          <h1 className="text-base font-semibold tracking-tight" style={{ color: "var(--accent)" }}>ool</h1>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative" ref={sortRef}>
            <button onClick={() => setShowSort(p => !p)} className={`toolbar-btn ${showSort ? "active" : ""}`} title="Sort">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
            </button>
            {showSort && (
              <div className="sort-dropdown">
                {([["modified", "By date"], ["alpha", "By title"], ["color", "By color"]] as [SortMode, string][]).map(([m, l]) => (
                  <button key={m} onClick={() => { setSortMode(m); setShowSort(false); }} className={`sort-option ${sortMode === m ? "active" : ""}`}>{l}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onNew} className="toolbar-btn" title="New note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes..." className="search-input" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-6 py-12 text-center animate-fade-in">
            <div className="enso mx-auto mb-4" style={{ width: 48, height: 48, borderWidth: 2, opacity: 0.2 }} />
            <p className="zen-quote mb-4">In the beginner&apos;s mind<br />there are many possibilities.</p>
            <button onClick={onNew} className="text-[var(--accent)] text-sm hover:text-[var(--accent-hover)] transition-colors">Begin writing</button>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-4">or drop .md files here</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-8 text-center text-[var(--text-tertiary)] text-sm">No notes found</div>
        ) : (
          <div className="py-0.5">
            {filtered.map((note, i) => (
              <div key={note.id} onClick={() => onSelect(note.id)}
                className={`note-item group flex items-start gap-3 px-6 py-3 cursor-pointer ${note.id === activeId ? "active bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-secondary)]"}`}
                style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="color-dot" style={{ background: NOTE_COLORS[note.color].dot }} />
                  {note.pinned && <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate leading-snug">{getTitle(note)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{formatDate(note.updatedAt)}</span>
                    {getPreview(note) && <span className="text-[11px] text-[var(--text-tertiary)] truncate">{getPreview(note)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5">
                  <button onClick={e => { e.stopPropagation(); onPin(note.id); }}
                    className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)] ${note.pinned ? "text-[var(--accent)]" : ""}`} title={note.pinned ? "Unpin" : "Pin"}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(note.content); }}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)]" title="Copy">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(note.id); }}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--border)] transition-all text-[var(--text-tertiary)] hover:text-[var(--danger)]" title="Delete">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex items-center gap-3">
        <span className="text-[10px] text-[var(--text-tertiary)]">{notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : ""}</span>
        <button onClick={onThemeToggle} className="theme-toggle" title={isDarkTheme ? "Light mode" : "Dark mode"} />
      </div>
    </div>
  );
}

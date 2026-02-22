"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Note, NoteColor, NOTE_COLORS } from "@/lib/types";
import { getWordCount, getReadingTime, getHeadings, getTitle } from "@/lib/notes";
import TiptapEditor, { getTiptapInsert } from "./TiptapEditor";
import AiPanel from "./AiPanel";

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onBack: () => void;
  onColorChange: (color: NoteColor) => void;
  onEmail: () => void;
}

export default function Editor({ note, onChange, onBack, onColorChange, onEmail }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selection, setSelection] = useState("");
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Auto-save indicator
  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (note.content) saveTimer.current = setTimeout(() => setSaved(true), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [note.content]);

  // Outside click closers
  useOutsideClick(colorRef, showColorPicker, () => setShowColorPicker(false));
  useOutsideClick(tocRef, showToc, () => setShowToc(false));
  useOutsideClick(moreRef, showMore, () => setShowMore(false));

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowColorPicker(false); setShowToc(false); setShowAi(false); setShowMore(false); }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") { e.preventDefault(); setShowAi(a => !a); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const noteContentRef = useRef(note.content);
  useEffect(() => { noteContentRef.current = note.content; }, [note.content]);

  const handleAiInsert = useCallback((text: string) => {
    const insert = getTiptapInsert();
    if (insert) { insert(text); showToast("Inserted"); }
    else {
      const c = noteContentRef.current;
      onChange(c + (c.endsWith("\n") || !c ? "" : "\n\n") + text);
      showToast("Inserted");
    }
  }, [onChange, showToast]);

  const handleDownload = () => {
    const blob = new Blob([note.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${getTitle(note).replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click(); URL.revokeObjectURL(url); showToast("Downloaded");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(note.content);
    showToast("Copied");
  };

  const wordCount = getWordCount(note.content);
  const headings = useMemo(() => getHeadings(note.content), [note.content]);
  const noteColor = NOTE_COLORS[note.color];

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 sm:px-4 md:px-6 py-1.5 border-b border-[var(--border-subtle)]">
        {/* Back (mobile) */}
        <button onClick={onBack} className="toolbar-btn md:hidden shrink-0" aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        {/* Color */}
        <div className="relative shrink-0" ref={colorRef}>
          <button onClick={() => setShowColorPicker(p => !p)} className="toolbar-btn" title="Color">
            <div style={{ background: noteColor.dot, width: 10, height: 10, borderRadius: "50%" }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-50 mt-1 p-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg animate-fade-in">
              <div className="flex gap-2">
                {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
                  <button key={c} onClick={() => { onColorChange(c); setShowColorPicker(false); }}
                    className={`color-picker-dot ${note.color === c ? "selected" : ""}`}
                    style={{ background: NOTE_COLORS[c].dot }} title={NOTE_COLORS[c].label} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TOC */}
        {headings.length > 0 && (
          <div className="relative shrink-0" ref={tocRef}>
            <button onClick={() => setShowToc(p => !p)} className={`toolbar-btn ${showToc ? "active" : ""}`} title="Contents">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            {showToc && (
              <div className="toc-panel">
                {headings.map((h, i) => (
                  <button key={i} className="toc-item" style={{ paddingLeft: `${12 + (h.level - 1) * 12}px` }}>{h.text}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-1" />

        {/* Right side */}
        <div className="flex items-center gap-0.5 shrink-0">
          {saved && note.content && <span className="text-[10px] text-[var(--text-tertiary)] mr-0.5 animate-fade-in hidden sm:inline">saved</span>}

          <button onClick={() => setShowAi(a => !a)} className={`toolbar-btn ${showAi ? "active" : ""}`} title="AI (Ctrl+J)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
          </button>

          {/* Mobile overflow */}
          <div ref={moreRef} className="sm:hidden relative">
            <button onClick={() => setShowMore(o => !o)} className="toolbar-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            {showMore && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden animate-fade-in min-w-[140px]">
                <button onClick={() => { handleCopy(); setShowMore(false); }} className="more-menu-item">Copy</button>
                <button onClick={() => { handleDownload(); setShowMore(false); }} className="more-menu-item">Download</button>
                <button onClick={() => { onEmail(); setShowMore(false); }} className="more-menu-item">Email</button>
              </div>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-0.5">
            <button onClick={handleCopy} className="toolbar-btn" title="Copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button onClick={handleDownload} className="toolbar-btn" title="Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button onClick={onEmail} className="toolbar-btn" title="Email">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{wordCount}w</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">{getReadingTime(wordCount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ background: noteColor.bg }}>
        <div className="tiptap-wrapper px-5 py-5 sm:px-8 md:px-14 lg:px-20 md:py-10">
          <TiptapEditor content={note.content} onChange={onChange} onSelectionChange={setSelection} placeholder="Start writing..." autoFocus />
        </div>
      </div>

      {/* Mobile bottom */}
      <div className="flex sm:hidden items-center justify-end gap-3 px-6 pr-8 py-2.5 border-t border-[var(--border-subtle)]">
        {saved && note.content && <span className="text-[11px] text-[var(--text-tertiary)] animate-fade-in">saved</span>}
        <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{wordCount}w</span>
      </div>

      <AiPanel open={showAi} onClose={() => setShowAi(false)} noteContent={note.content} selection={selection} onInsert={handleAiInsert} />
      {toast && <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 toast">{toast}</div>}
    </div>
  );
}

// Reusable outside-click hook
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [active, ref, onClose]);
}

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Note, NoteColor, NOTE_COLORS, CanvasBlock } from "@/lib/types";
import { getWordCount, getTitle, getReadingTime, getHeadings } from "@/lib/notes";
import MarkdownPreview from "./MarkdownPreview";
import TiptapEditor, { getTiptapInsert } from "./TiptapEditor";
import Canvas from "./Canvas";
import AiPanel from "./AiPanel";

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onBack: () => void;
  onColorChange: (color: NoteColor) => void;
  onEmail: () => void;
  onModeChange: (mode: 'markdown' | 'canvas') => void;
  onBlocksChange: (blocks: CanvasBlock[]) => void;
  externalFocusToggle?: boolean;
  externalPreviewToggle?: boolean;
  externalPresentationToggle?: boolean;
  externalTypewriterToggle?: boolean;
  externalAiToggle?: boolean;
}

export default function Editor({
  note, onChange, onBack, onColorChange, onEmail,
  onModeChange, onBlocksChange,
  externalFocusToggle, externalPreviewToggle,
  externalPresentationToggle, externalTypewriterToggle,
  externalAiToggle,
}: Props) {
  const [focusMode, setFocusMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [selection, setSelection] = useState("");
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [noteKey, setNoteKey] = useState(note.id);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const isCanvas = note.mode === 'canvas';

  // Track note transitions
  useEffect(() => {
    setNoteKey(note.id);
  }, [note.id]);

  // External toggle guards — skip first render
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) return;
    setFocusMode(f => !f);
  }, [externalFocusToggle]);

  useEffect(() => {
    if (initialRender.current) return;
    // Preview toggle — no-op in WYSIWYG mode, kept for command palette compat
  }, [externalPreviewToggle]);

  useEffect(() => {
    if (initialRender.current) return;
    setPresentationMode(p => !p);
  }, [externalPresentationToggle]);

  useEffect(() => {
    if (initialRender.current) return;
    // Typewriter — future Tiptap extension
  }, [externalTypewriterToggle]);

  useEffect(() => {
    if (initialRender.current) return;
    setShowAi(a => !a);
  }, [externalAiToggle]);

  useEffect(() => { initialRender.current = false; }, []);

  // Auto-save indicator
  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (note.content || (note.blocks && note.blocks.length > 0)) {
      saveTimer.current = setTimeout(() => setSaved(true), 800);
    }
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [note.content, note.blocks]);

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const h = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setShowColorPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showColorPicker]);

  // Close TOC on outside click
  useEffect(() => {
    if (!showToc) return;
    const h = (e: MouseEvent) => {
      if (tocRef.current && !tocRef.current.contains(e.target as Node)) setShowToc(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showToc]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (presentationMode) { setPresentationMode(false); return; }
        if (focusMode) { setFocusMode(false); return; }
        if (showColorPicker) { setShowColorPicker(false); return; }
        if (showToc) { setShowToc(false); return; }
        if (showAi) { setShowAi(false); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setFocusMode(f => !f);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        showToast("Saved automatically");
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "e") {
        e.preventDefault();
        onEmail();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setShowAi(a => !a);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusMode, presentationMode, showColorPicker, showToc, showAi, showToast, onEmail]);

  const handleSelectionChange = useCallback((text: string) => {
    setSelection(text);
  }, []);

  const handleDownload = () => {
    const title = getTitle(note);
    let content = note.content;
    if (isCanvas && note.blocks) {
      content = note.blocks.map(b => b.content).filter(Boolean).join("\n\n---\n\n");
    }
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded");
  };

  const handlePdf = () => { window.print(); };

  const handleCopyContent = async () => {
    let content = note.content;
    if (isCanvas && note.blocks) {
      content = note.blocks.map(b => b.content).filter(Boolean).join("\n\n---\n\n");
    }
    await navigator.clipboard.writeText(content);
    showToast("Copied to clipboard");
  };

  const noteContentRef = useRef(note.content);
  useEffect(() => { noteContentRef.current = note.content; }, [note.content]);

  const handleAiInsert = useCallback((text: string) => {
    const insert = getTiptapInsert();
    if (insert) {
      insert(text);
      showToast("Inserted");
    } else {
      const c = noteContentRef.current;
      const sep = c.endsWith("\n") || c === "" ? "" : "\n\n";
      onChange(c + sep + text);
      showToast("Inserted");
    }
  }, [onChange, showToast]);

  const wordCount = isCanvas
    ? (note.blocks || []).reduce((acc, b) => acc + getWordCount(b.content), 0)
    : getWordCount(note.content);
  const readingTime = getReadingTime(wordCount);
  const headings = useMemo(() => getHeadings(note.content), [note.content]);
  const noteColor = NOTE_COLORS[note.color];

  // ─── Presentation Mode ───
  if (presentationMode && !isCanvas) {
    return (
      <div className="presentation-mode" key={`pres-${noteKey}`}>
        <div className="flex items-center justify-between w-full px-8 md:px-16 py-4">
          <button onClick={() => setPresentationMode(false)} className="toolbar-btn" title="Exit (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="text-[11px] text-[var(--text-tertiary)]">{readingTime}</span>
        </div>
        <div className="flex-1 px-8 md:px-20 lg:px-32 py-8 max-w-5xl mx-auto w-full" style={{ background: noteColor.bg }}>
          <MarkdownPreview content={note.content} />
        </div>
      </div>
    );
  }

  // ─── Focus Mode ───
  if (focusMode && !isCanvas) {
    return (
      <div className="focus-mode" key={`focus-${noteKey}`}>
        <div className="ambient-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <div className="flex items-center justify-between w-full max-w-3xl px-8 md:px-12 py-4">
          <button onClick={() => setFocusMode(false)} className="toolbar-btn" title="Exit (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-[10px] text-[var(--text-tertiary)] animate-fade-in">saved</span>}
            <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{wordCount} words</span>
          </div>
        </div>
        <div className="flex-1 w-full max-w-3xl px-8 md:px-12 overflow-y-auto">
          <TiptapEditor
            content={note.content}
            onChange={onChange}
            onSelectionChange={handleSelectionChange}
            placeholder="Let your thoughts flow..."
            className="focus-tiptap"
            autoFocus
          />
        </div>
        <AiPanel open={showAi} onClose={() => setShowAi(false)} noteContent={note.content} selection={selection} onInsert={handleAiInsert} />
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 toast">{toast}</div>}
      </div>
    );
  }

  // ─── Normal Editor ───
  return (
    <div className="flex flex-col h-full relative" key={`editor-${noteKey}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 sm:px-4 md:px-6 py-1.5 border-b border-[var(--border-subtle)] overflow-x-auto scrollbar-hide" style={{ height: 'var(--toolbar-height)' }}>
        {/* Back (mobile) */}
        <button onClick={onBack} className="toolbar-btn md:hidden shrink-0" aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Color dot */}
        <div className="relative shrink-0" ref={colorPickerRef}>
          <button onClick={() => setShowColorPicker(p => !p)} className="toolbar-btn" title="Note color">
            <div className="color-dot" style={{ background: noteColor.dot, width: 10, height: 10 }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg z-30 animate-fade-in">
              <div className="flex gap-2">
                {(Object.keys(NOTE_COLORS) as NoteColor[]).map(c => (
                  <button
                    key={c}
                    onClick={() => { onColorChange(c); setShowColorPicker(false); }}
                    className={`color-picker-dot ${note.color === c ? 'selected' : ''}`}
                    style={{ background: NOTE_COLORS[c].dot }}
                    title={NOTE_COLORS[c].label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 shrink-0 ml-0.5 pl-0.5 border-l border-[var(--border-subtle)]">
          <button onClick={() => onModeChange('markdown')} className={`toolbar-btn ${!isCanvas ? 'active' : ''}`} title="Markdown">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
          <button onClick={() => onModeChange('canvas')} className={`toolbar-btn ${isCanvas ? 'active' : ''}`} title="Canvas">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="3" y="14" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>

        {/* TOC */}
        {!isCanvas && headings.length > 0 && (
          <div className="relative shrink-0" ref={tocRef}>
            <button onClick={() => setShowToc(p => !p)} className={`toolbar-btn ${showToc ? 'active' : ''}`} title="Table of contents">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            {showToc && (
              <div className="toc-panel">
                <div className="px-3 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Contents</div>
                {headings.map((h, i) => (
                  <button key={i} className="toc-item" style={{ paddingLeft: `${12 + (h.level - 1) * 12}px` }}>
                    {h.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-1" />

        {/* Right side */}
        <div className="flex items-center gap-0.5 shrink-0">
          {saved && (note.content || (note.blocks && note.blocks.length > 0)) && (
            <span className="text-[10px] text-[var(--text-tertiary)] mr-0.5 animate-fade-in hidden sm:inline">saved</span>
          )}

          {/* AI */}
          <button onClick={() => setShowAi(a => !a)} className={`toolbar-btn ${showAi ? 'active' : ''}`} title="AI (Ctrl+J)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
          </button>

          {/* Desktop-only buttons */}
          {!isCanvas && (
            <button onClick={() => setFocusMode(true)} className="toolbar-btn hidden sm:flex" title="Focus (Ctrl+Shift+F)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          )}

          <button onClick={handleCopyContent} className="toolbar-btn hidden sm:flex" title="Copy">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          <button onClick={handleDownload} className="toolbar-btn hidden sm:flex" title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Mobile overflow menu */}
          <MobileMore
            onFocus={() => setFocusMode(true)}
            onPresent={() => setPresentationMode(true)}
            onCopy={handleCopyContent}
            onDownload={handleDownload}
            onEmail={onEmail}
            isCanvas={isCanvas}
          />

          <button onClick={onEmail} className="toolbar-btn hidden sm:flex" title="Email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-1 border-l border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{wordCount}w</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{readingTime}</span>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-hidden animate-note-enter">
        {isCanvas ? (
          <Canvas blocks={note.blocks || []} onChange={onBlocksChange} noteColor={note.color} />
        ) : (
          <div className="h-full overflow-y-auto" style={{ background: NOTE_COLORS[note.color].bg }}>
            <div className="tiptap-wrapper px-5 py-5 sm:px-8 md:px-14 lg:px-20 md:py-10">
              <TiptapEditor
                content={note.content}
                onChange={onChange}
                onSelectionChange={handleSelectionChange}
                placeholder="Start writing..."
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom bar — just word count, no Write/Read toggle */}
      <div className="flex sm:hidden items-center justify-end gap-2 px-5 py-2 border-t border-[var(--border-subtle)]">
        {saved && note.content && (
          <span className="text-[10px] text-[var(--text-tertiary)] animate-fade-in">saved</span>
        )}
        <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{wordCount}w</span>
      </div>

      {/* AI Panel */}
      <AiPanel open={showAi} onClose={() => setShowAi(false)} noteContent={note.content} selection={selection} onInsert={handleAiInsert} />

      {/* Toast */}
      {toast && <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 toast">{toast}</div>}
    </div>
  );
}

// ─── Mobile overflow "⋮" menu ───
function MobileMore({ onFocus, onPresent, onCopy, onDownload, onEmail, isCanvas }: {
  onFocus: () => void; onPresent: () => void; onCopy: () => void;
  onDownload: () => void; onEmail: () => void; isCanvas: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const act = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <div ref={ref} className="sm:hidden relative">
      <button onClick={() => setOpen(o => !o)} className="toolbar-btn" title="More">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden animate-fade-in min-w-[160px]">
          {!isCanvas && <button onClick={() => act(onFocus)} className="more-menu-item">Focus mode</button>}
          {!isCanvas && <button onClick={() => act(onPresent)} className="more-menu-item">Present</button>}
          <button onClick={() => act(onCopy)} className="more-menu-item">Copy</button>
          <button onClick={() => act(onDownload)} className="more-menu-item">Download .md</button>
          <button onClick={() => act(onEmail)} className="more-menu-item">Email</button>
        </div>
      )}
    </div>
  );
}

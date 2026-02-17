"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Note, NoteColor, NOTE_COLORS } from "@/lib/types";
import { getWordCount, getTitle } from "@/lib/notes";
import MarkdownPreview from "./MarkdownPreview";

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onBack: () => void;
  onColorChange: (color: NoteColor) => void;
  onEmail: () => void;
  externalFocusToggle?: boolean;
  externalPreviewToggle?: boolean;
}

export default function Editor({ note, onChange, onBack, onColorChange, onEmail, externalFocusToggle, externalPreviewToggle }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<"write" | "read">("write");
  const [focusMode, setFocusMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusTextareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus textarea on note change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [note.id]);

  useEffect(() => {
    if (focusMode && focusTextareaRef.current) {
      focusTextareaRef.current.focus();
    }
  }, [focusMode]);

  // External toggles from command palette
  useEffect(() => {
    if (externalFocusToggle !== undefined) {
      setFocusMode(f => !f);
    }
  }, [externalFocusToggle]);

  useEffect(() => {
    if (externalPreviewToggle !== undefined) {
      setShowPreview(p => !p);
    }
  }, [externalPreviewToggle]);

  // Show "saved" indicator on content change
  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (note.content) {
      saveTimer.current = setTimeout(() => setSaved(true), 800);
    }
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [note.content]);

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColorPicker]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (focusMode) { setFocusMode(false); return; }
        if (showColorPicker) { setShowColorPicker(false); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setShowPreview(p => !p);
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
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusMode, showColorPicker, showToast, onEmail]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  const insertFormat = (prefix: string, suffix: string = "") => {
    const textarea = focusMode ? focusTextareaRef.current : textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const replacement = prefix + (selected || "text") + (suffix || prefix);
    const newValue = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + (selected || "text").length;
      textarea.focus();
    });
  };

  const handleDownload = () => {
    const title = getTitle(note);
    const blob = new Blob([note.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded");
  };

  const wordCount = getWordCount(note.content);
  const noteColor = NOTE_COLORS[note.color];

  // Focus Mode
  if (focusMode) {
    return (
      <div className="focus-mode">
        <div className="ambient-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

        <div className="flex items-center justify-between w-full max-w-3xl px-6 py-4">
          <button onClick={() => setFocusMode(false)} className="toolbar-btn" title="Exit focus mode (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-[10px] text-[var(--text-tertiary)] animate-fade-in">saved</span>}
            <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{wordCount} words</span>
          </div>
        </div>

        <div className="flex-1 w-full max-w-3xl px-6 overflow-hidden">
          <textarea
            ref={focusTextareaRef}
            value={note.content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Let your thoughts flow..."
            className="editor-textarea w-full h-full"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border-subtle)]" style={{ height: 'var(--toolbar-height)' }}>
        {/* Back button (mobile) */}
        <button onClick={onBack} className="toolbar-btn md:hidden" aria-label="Back to notes">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Color indicator */}
        <div className="relative ml-1" ref={colorPickerRef}>
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

        {/* Formatting */}
        <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-1 border-l border-[var(--border-subtle)]">
          <button onClick={() => insertFormat("**")} className="toolbar-btn" title="Bold (Ctrl+B)">
            <span className="text-xs font-bold">B</span>
          </button>
          <button onClick={() => insertFormat("*")} className="toolbar-btn" title="Italic (Ctrl+I)">
            <span className="text-xs italic">I</span>
          </button>
          <button onClick={() => insertFormat("~~")} className="toolbar-btn" title="Strikethrough">
            <span className="text-xs line-through">S</span>
          </button>
          <button onClick={() => insertFormat("`")} className="toolbar-btn" title="Code">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button onClick={() => insertFormat("[", "](url)")} className="toolbar-btn" title="Link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button onClick={() => { const h = "\n## "; insertFormat(h, ""); }} className="toolbar-btn" title="Heading">
            <span className="text-xs font-semibold">H</span>
          </button>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-0.5">
          {/* Saved indicator */}
          {saved && note.content && (
            <span className="text-[10px] text-[var(--text-tertiary)] mr-1 animate-fade-in hidden sm:inline">saved</span>
          )}

          {/* Preview toggle (desktop) */}
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`toolbar-btn hidden md:flex ${showPreview ? 'active' : ''}`}
            title="Toggle preview (Ctrl+P)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showPreview ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>

          {/* Focus mode */}
          <button onClick={() => setFocusMode(true)} className="toolbar-btn" title="Focus mode (Ctrl+Shift+F)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          {/* Download */}
          <button onClick={handleDownload} className="toolbar-btn" title="Download as .md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Email */}
          <button onClick={onEmail} className="toolbar-btn" title="Share via email (Ctrl+Shift+E)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>

          {/* Word count */}
          <span className="text-[10px] text-[var(--text-tertiary)] ml-1.5 tabular-nums hidden sm:inline">
            {wordCount}w
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: side by side */}
        <div className={`hidden md:block ${showPreview ? 'w-1/2' : 'w-full'} h-full overflow-hidden`}>
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing..."
            className="editor-textarea w-full h-full p-4 md:p-6"
            spellCheck={false}
          />
        </div>

        {showPreview && <div className="divider-vertical hidden md:block" />}

        {showPreview && (
          <div className="hidden md:block w-1/2 h-full overflow-y-auto p-4 md:p-6" style={{ background: NOTE_COLORS[note.color].bg }}>
            <MarkdownPreview content={note.content} />
          </div>
        )}

        {/* Mobile: write or read tab */}
        <div className="md:hidden w-full h-full overflow-hidden">
          {mobileTab === "write" ? (
            <textarea
              value={note.content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start writing..."
              className="editor-textarea w-full h-full p-4"
              spellCheck={false}
            />
          ) : (
            <div className="h-full overflow-y-auto p-4" style={{ background: NOTE_COLORS[note.color].bg }}>
              <MarkdownPreview content={note.content} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile toggle bar */}
      <div className="flex md:hidden items-center justify-between px-3 py-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-0.5">
          <button
            onClick={() => setMobileTab("write")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${mobileTab === "write" ? 'bg-[var(--bg-hover)] text-[var(--text)]' : 'text-[var(--text-tertiary)]'}`}
          >
            Write
          </button>
          <button
            onClick={() => setMobileTab("read")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${mobileTab === "read" ? 'bg-[var(--bg-hover)] text-[var(--text)]' : 'text-[var(--text-tertiary)]'}`}
          >
            Read
          </button>
        </div>

        <div className="flex items-center gap-2">
          {saved && note.content && (
            <span className="text-[10px] text-[var(--text-tertiary)] animate-fade-in">saved</span>
          )}
          <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{wordCount}w</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 toast">
          {toast}
        </div>
      )}
    </div>
  );
}

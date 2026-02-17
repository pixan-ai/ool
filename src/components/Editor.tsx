"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Note, NoteColor, NOTE_COLORS } from "@/lib/types";
import { getWordCount } from "@/lib/notes";
import MarkdownPreview from "./MarkdownPreview";

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onBack: () => void;
  onColorChange: (color: NoteColor) => void;
  onEmail: () => void;
}

export default function Editor({ note, onChange, onBack, onColorChange, onEmail }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Show toast briefly
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setShowPreview(p => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setFocusMode(f => !f);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusMode]);

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

  // Insert markdown formatting
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

  const wordCount = getWordCount(note.content);
  const noteColor = NOTE_COLORS[note.color];

  // Focus Mode
  if (focusMode) {
    return (
      <div className="focus-mode">
        {/* Ambient */}
        <div className="ambient-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

        {/* Top bar */}
        <div className="flex items-center justify-between w-full max-w-3xl px-6 py-4">
          <button onClick={() => setFocusMode(false)} className="toolbar-btn" title="Exit focus mode (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">{wordCount} words</span>
        </div>

        {/* Editor */}
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
        <div className="relative ml-1">
          <button
            onClick={() => setShowColorPicker(p => !p)}
            className="toolbar-btn"
            title="Note color"
          >
            <div className="color-dot" style={{ background: noteColor.dot, width: 10, height: 10 }} />
          </button>

          {/* Color picker dropdown */}
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg z-30 animate-fade-in">
              <div className="flex gap-1.5">
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
          <button onClick={() => insertFormat("**")} className="toolbar-btn" title="Bold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            </svg>
          </button>
          <button onClick={() => insertFormat("*")} className="toolbar-btn" title="Italic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>
          <button onClick={() => insertFormat("`")} className="toolbar-btn" title="Code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button onClick={() => insertFormat("[", "](url)")} className="toolbar-btn" title="Link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-0.5">
          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`toolbar-btn hidden md:flex ${showPreview ? 'active' : ''}`}
            title="Toggle preview (Ctrl+P)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Focus mode */}
          <button onClick={() => setFocusMode(true)} className="toolbar-btn" title="Focus mode (Ctrl+Shift+F)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          {/* Email */}
          <button onClick={onEmail} className="toolbar-btn" title="Share via email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>

          {/* Word count */}
          <span className="text-[10px] text-[var(--text-tertiary)] ml-2 tabular-nums hidden sm:inline">
            {wordCount}w
          </span>
        </div>
      </div>

      {/* Content area — side by side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div className={`${showPreview ? 'w-1/2 hidden md:block' : 'w-full'} h-full overflow-hidden`}>
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

        {/* Divider */}
        {showPreview && <div className="divider-vertical hidden md:block" />}

        {/* Preview pane — live updating */}
        {showPreview && (
          <div className="w-full md:w-1/2 h-full overflow-y-auto p-4 md:p-6" style={{ background: NOTE_COLORS[note.color].bg }}>
            <MarkdownPreview content={note.content} />
          </div>
        )}

        {/* Mobile: show textarea when preview is off, preview when on */}
        {!showPreview && (
          <div className="md:hidden" /> /* placeholder — textarea already shown full width */
        )}
      </div>

      {/* Mobile toggle bar */}
      <div className="flex md:hidden items-center justify-center gap-4 py-2 border-t border-[var(--border-subtle)]">
        <button
          onClick={() => setShowPreview(false)}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${!showPreview ? 'bg-[var(--bg-hover)] text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}
        >
          Write
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${showPreview ? 'bg-[var(--bg-hover)] text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}
        >
          Read
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 toast">
          {toast}
        </div>
      )}
    </div>
  );
}

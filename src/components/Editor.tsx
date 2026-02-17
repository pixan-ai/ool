"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Note, NoteColor, NOTE_COLORS, CanvasBlock } from "@/lib/types";
import { getWordCount, getTitle, getReadingTime, getHeadings } from "@/lib/notes";
import MarkdownPreview from "./MarkdownPreview";
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
  const [showPreview, setShowPreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<"write" | "read">("write");
  const [focusMode, setFocusMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [selection, setSelection] = useState("");
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [noteKey, setNoteKey] = useState(note.id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusTextareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const isCanvas = note.mode === 'canvas';

  // Track note transitions
  useEffect(() => {
    setNoteKey(note.id);
    if (textareaRef.current && !isCanvas) {
      textareaRef.current.focus();
    }
  }, [note.id, isCanvas]);

  useEffect(() => {
    if (focusMode && focusTextareaRef.current) focusTextareaRef.current.focus();
  }, [focusMode]);

  useEffect(() => {
    if (externalFocusToggle !== undefined) setFocusMode(f => !f);
  }, [externalFocusToggle]);

  useEffect(() => {
    if (externalPreviewToggle !== undefined) setShowPreview(p => !p);
  }, [externalPreviewToggle]);

  useEffect(() => {
    if (externalPresentationToggle !== undefined) setPresentationMode(p => !p);
  }, [externalPresentationToggle]);

  useEffect(() => {
    if (externalTypewriterToggle !== undefined) setTypewriterMode(t => !t);
  }, [externalTypewriterToggle]);

  useEffect(() => {
    if (externalAiToggle !== undefined) setShowAi(a => !a);
  }, [externalAiToggle]);

  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (note.content || (note.blocks && note.blocks.length > 0)) {
      saveTimer.current = setTimeout(() => setSaved(true), 800);
    }
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [note.content, note.blocks]);

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

  useEffect(() => {
    if (!showToc) return;
    const handleClick = (e: MouseEvent) => {
      if (tocRef.current && !tocRef.current.contains(e.target as Node)) {
        setShowToc(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showToc]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (presentationMode) { setPresentationMode(false); return; }
        if (focusMode) { setFocusMode(false); return; }
        if (showColorPicker) { setShowColorPicker(false); return; }
        if (showToc) { setShowToc(false); return; }
        if (showAi) { setShowAi(false); return; }
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
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setShowAi(a => !a);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusMode, presentationMode, showColorPicker, showToc, showAi, showToast, onEmail]);

  // Track selection for AI
  const handleSelectionChange = useCallback(() => {
    const textarea = focusMode ? focusTextareaRef.current : textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start !== end) {
      setSelection(textarea.value.substring(start, end));
    } else {
      setSelection("");
    }
  }, [focusMode]);

  // Auto-lists on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const textBefore = target.value.substring(0, start);
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1];

      // List continuation patterns
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      const checkboxMatch = currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s/);

      const match = checkboxMatch || bulletMatch || numberedMatch;
      if (match) {
        const lineContent = currentLine.substring(match[0].length);
        if (!lineContent.trim()) {
          // Empty list item — remove it
          e.preventDefault();
          const beforeLine = target.value.substring(0, start - currentLine.length);
          const afterCursor = target.value.substring(start);
          const newValue = beforeLine + afterCursor;
          onChange(newValue);
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = beforeLine.length;
          });
          return;
        }
        // Continue list
        e.preventDefault();
        const [, indent] = match;
        let nextPrefix: string;
        if (checkboxMatch) {
          nextPrefix = `${indent}${checkboxMatch[2]} [ ] `;
        } else if (numberedMatch) {
          nextPrefix = `${indent}${parseInt(numberedMatch[2]) + 1}. `;
        } else {
          nextPrefix = `${indent}${match[2]} `;
        }
        const insertion = '\n' + nextPrefix;
        const newValue = target.value.substring(0, start) + insertion + target.value.substring(start);
        onChange(newValue);
        requestAnimationFrame(() => {
          const newPos = start + insertion.length;
          target.selectionStart = target.selectionEnd = newPos;
        });
        return;
      }
    }

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

  // Paste images as base64
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const markdown = `![image](${base64})\n`;
          const textarea = focusMode ? focusTextareaRef.current : textareaRef.current;
          if (!textarea) return;
          const start = textarea.selectionStart;
          const newValue = textarea.value.substring(0, start) + markdown + textarea.value.substring(textarea.selectionEnd);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
          });
        };
        reader.readAsDataURL(file);
        showToast("Image pasted");
        break;
      }
    }
  };

  // Synced scroll
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (!previewRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight <= clientHeight) return;
    const ratio = scrollTop / (scrollHeight - clientHeight);
    previewRef.current.scrollTop = ratio * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
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

  const handlePdf = () => {
    window.print();
  };

  const handleCopyContent = async () => {
    let content = note.content;
    if (isCanvas && note.blocks) {
      content = note.blocks.map(b => b.content).filter(Boolean).join("\n\n---\n\n");
    }
    await navigator.clipboard.writeText(content);
    showToast("Copied to clipboard");
  };

  const handleAiInsert = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Append to end if no textarea
      onChange(note.content + "\n\n" + text);
      return;
    }
    const pos = textarea.selectionEnd || note.content.length;
    const before = note.content.substring(0, pos);
    const after = note.content.substring(pos);
    const separator = before.endsWith("\n") || before === "" ? "" : "\n\n";
    onChange(before + separator + text + after);
    showToast("Inserted");
  }, [note.content, onChange, showToast]);

  const handleTocJump = useCallback((line: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lines = textarea.value.split("\n");
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    textarea.selectionStart = textarea.selectionEnd = pos;
    textarea.focus();
    // Scroll textarea to position
    const lineHeight = 24;
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 3);
    setShowToc(false);
  }, []);

  const wordCount = isCanvas
    ? (note.blocks || []).reduce((acc, b) => acc + getWordCount(b.content), 0)
    : getWordCount(note.content);

  const readingTime = getReadingTime(wordCount);
  const headings = useMemo(() => getHeadings(note.content), [note.content]);
  const noteColor = NOTE_COLORS[note.color];

  // Presentation Mode
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

  // Focus Mode (only for markdown)
  if (focusMode && !isCanvas) {
    return (
      <div className="focus-mode" key={`focus-${noteKey}`}>
        <div className="ambient-circle" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <div className="flex items-center justify-between w-full max-w-3xl px-8 md:px-12 py-4">
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
        <div className="flex-1 w-full max-w-3xl px-8 md:px-12 overflow-hidden">
          <textarea
            ref={focusTextareaRef}
            value={note.content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onSelect={handleSelectionChange}
            placeholder="Let your thoughts flow..."
            className={`editor-textarea w-full h-full ${typewriterMode ? 'typewriter-mode' : ''}`}
            spellCheck={false}
          />
        </div>
        {/* AI Panel */}
        <AiPanel
          open={showAi}
          onClose={() => setShowAi(false)}
          noteContent={note.content}
          selection={selection}
          onInsert={handleAiInsert}
        />
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" key={`editor-${noteKey}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-5 md:px-8 py-1.5 border-b border-[var(--border-subtle)]" style={{ height: 'var(--toolbar-height)' }}>
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

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-[var(--border-subtle)]">
          <button onClick={() => onModeChange('markdown')} className={`toolbar-btn ${!isCanvas ? 'active' : ''}`} title="Markdown mode">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
          <button onClick={() => onModeChange('canvas')} className={`toolbar-btn ${isCanvas ? 'active' : ''}`} title="Canvas mode">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="3" y="14" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>

        {/* Formatting (markdown only) */}
        {!isCanvas && (
          <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-1 border-l border-[var(--border-subtle)]">
            <button onClick={() => insertFormat("**")} className="toolbar-btn" title="Bold"><span className="text-xs font-bold">B</span></button>
            <button onClick={() => insertFormat("*")} className="toolbar-btn" title="Italic"><span className="text-xs italic">I</span></button>
            <button onClick={() => insertFormat("~~")} className="toolbar-btn" title="Strikethrough"><span className="text-xs line-through">S</span></button>
            <button onClick={() => insertFormat("`")} className="toolbar-btn" title="Code">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
              </svg>
            </button>
            <button onClick={() => insertFormat("### ", "\n")} className="toolbar-btn" title="Heading">
              <span className="text-[10px] font-bold">H</span>
            </button>
          </div>
        )}

        {/* TOC button */}
        {!isCanvas && headings.length > 0 && (
          <div className="relative" ref={tocRef}>
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
                  <button
                    key={i}
                    onClick={() => handleTocJump(h.line)}
                    className="toc-item"
                    style={{ paddingLeft: `${12 + (h.level - 1) * 12}px` }}
                  >
                    {h.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-0.5">
          {saved && (note.content || (note.blocks && note.blocks.length > 0)) && (
            <span className="text-[10px] text-[var(--text-tertiary)] mr-1 animate-fade-in hidden sm:inline">saved</span>
          )}

          {/* AI button */}
          <button
            onClick={() => setShowAi(a => !a)}
            className={`toolbar-btn ${showAi ? 'active' : ''}`}
            title="AI assistant (Ctrl+J)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
          </button>

          {!isCanvas && (
            <button
              onClick={() => setShowPreview(p => !p)}
              className={`toolbar-btn hidden md:flex ${showPreview ? 'active' : ''}`}
              title="Toggle preview (Ctrl+P)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}

          {!isCanvas && (
            <button onClick={() => setFocusMode(true)} className="toolbar-btn" title="Focus mode (Ctrl+Shift+F)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          )}

          {!isCanvas && (
            <button onClick={() => setPresentationMode(true)} className="toolbar-btn" title="Present">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </button>
          )}

          <button onClick={handleCopyContent} className="toolbar-btn" title="Copy content">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          <button onClick={handleDownload} className="toolbar-btn" title="Download .md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button onClick={onEmail} className="toolbar-btn" title="Email">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>

          <button onClick={handlePdf} className="toolbar-btn hidden md:flex" title="Print / PDF">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 ml-1.5 pl-1.5 border-l border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{wordCount}w</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{readingTime}</span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden animate-note-enter">
        {isCanvas ? (
          <Canvas blocks={note.blocks || []} onChange={onBlocksChange} noteColor={note.color} />
        ) : (
          <>
            {/* Desktop: side by side */}
            <div className={`hidden md:block ${showPreview ? 'w-1/2' : 'w-full'} h-full overflow-hidden`}>
              <textarea
                ref={textareaRef}
                value={note.content}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onScroll={handleEditorScroll}
                onSelect={handleSelectionChange}
                placeholder="Start writing..."
                className={`editor-textarea w-full h-full p-8 md:p-14 lg:p-20 ${typewriterMode ? 'typewriter-mode' : ''}`}
                spellCheck={false}
              />
            </div>

            {showPreview && <div className="divider-vertical hidden md:block" />}

            {showPreview && (
              <div
                ref={previewRef}
                className="hidden md:block w-1/2 h-full overflow-y-auto p-8 md:p-14 lg:p-20"
                style={{ background: NOTE_COLORS[note.color].bg }}
              >
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
                  onPaste={handlePaste}
                  onSelect={handleSelectionChange}
                  placeholder="Start writing..."
                  className={`editor-textarea w-full h-full p-6 sm:p-8 ${typewriterMode ? 'typewriter-mode' : ''}`}
                  spellCheck={false}
                />
              ) : (
                <div className="h-full overflow-y-auto p-6 sm:p-8" style={{ background: NOTE_COLORS[note.color].bg }}>
                  <MarkdownPreview content={note.content} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile toggle bar (markdown only) */}
      {!isCanvas && (
        <div className="flex md:hidden items-center justify-between px-5 py-2.5 border-t border-[var(--border-subtle)]">
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
      )}

      {/* AI Panel */}
      <AiPanel
        open={showAi}
        onClose={() => setShowAi(false)}
        noteContent={note.content}
        selection={selection}
        onInsert={handleAiInsert}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 toast">{toast}</div>
      )}
    </div>
  );
}

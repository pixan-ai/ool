"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Note, NoteColor, CanvasBlock } from "@/lib/types";
import { loadNotes, createNote, updateNote, updateNoteColor, updateNoteMode, updateNoteBlocks, deleteNote, togglePin, getTitle } from "@/lib/notes";
import NoteList from "@/components/NoteList";
import Editor from "@/components/Editor";
import CommandPalette from "@/components/CommandPalette";

const THEME_KEY = "ool-theme";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [focusModeFromPalette, setFocusModeFromPalette] = useState(false);
  const [togglePreviewFromPalette, setTogglePreviewFromPalette] = useState(false);
  const [presentationFromPalette, setPresentationFromPalette] = useState(false);
  const [typewriterFromPalette, setTypewriterFromPalette] = useState(false);
  const [aiFromPalette, setAiFromPalette] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const blocksSaveTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }
    // Load theme preference
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  const handleNew = useCallback(() => {
    const note = createNote();
    setNotes(loadNotes());
    setActiveId(note.id);
    setShowSidebar(false);
  }, []);

  // Keyboard shortcuts (must be after handleNew definition)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen(p => !p);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNew();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNew]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setShowSidebar(false);
  }, []);

  const handleChange = useCallback(
    (content: string) => {
      if (!activeId) return;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId ? { ...n, content, updatedAt: Date.now() } : n
        )
      );
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updateNote(activeId, content);
      }, 300);
    },
    [activeId]
  );

  const handleColorChange = useCallback(
    (color: NoteColor) => {
      if (!activeId) return;
      updateNoteColor(activeId, color);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId ? { ...n, color } : n
        )
      );
    },
    [activeId]
  );

  const handleModeChange = useCallback(
    (mode: 'markdown' | 'canvas') => {
      if (!activeId) return;
      updateNoteMode(activeId, mode);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId ? { ...n, mode, updatedAt: Date.now() } : n
        )
      );
    },
    [activeId]
  );

  const handleBlocksChange = useCallback(
    (blocks: CanvasBlock[]) => {
      if (!activeId) return;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId ? { ...n, blocks, updatedAt: Date.now() } : n
        )
      );
      if (blocksSaveTimeout.current) clearTimeout(blocksSaveTimeout.current);
      blocksSaveTimeout.current = setTimeout(() => {
        updateNoteBlocks(activeId, blocks);
      }, 300);
    },
    [activeId]
  );

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirm(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return;
    deleteNote(deleteConfirm);
    const updated = loadNotes();
    setNotes(updated);
    if (activeId === deleteConfirm) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
      if (updated.length === 0) setShowSidebar(true);
    }
    setDeleteConfirm(null);
  }, [activeId, deleteConfirm]);

  const handlePin = useCallback(
    (id: string) => {
      togglePin(id);
      setNotes(loadNotes());
    },
    []
  );

  const handleImport = useCallback(() => {
    setNotes(loadNotes());
  }, []);

  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  const handleEmail = useCallback(() => {
    if (!activeNote) return;
    const title = getTitle(activeNote);
    const subject = encodeURIComponent(title);
    let content = activeNote.content;
    if (activeNote.mode === 'canvas' && activeNote.blocks) {
      content = activeNote.blocks.map(b => b.content).filter(Boolean).join("\n\n---\n\n");
    }
    const body = encodeURIComponent(content);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [activeNote]);

  const handleThemeToggle = useCallback(() => {
    setIsDark(prev => {
      const newDark = !prev;
      if (newDark) {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
        localStorage.setItem(THEME_KEY, "dark");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        localStorage.setItem(THEME_KEY, "light");
      }
      return newDark;
    });
  }, []);

  const handleFocusMode = useCallback(() => {
    setFocusModeFromPalette(p => !p);
  }, []);

  const handleTogglePreview = useCallback(() => {
    setTogglePreviewFromPalette(p => !p);
  }, []);

  const handlePresentation = useCallback(() => {
    setPresentationFromPalette(p => !p);
  }, []);

  const handleTypewriter = useCallback(() => {
    setTypewriterFromPalette(p => !p);
  }, []);

  const handleAi = useCallback(() => {
    setAiFromPalette(p => !p);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="enso" style={{ width: 40, height: 40, opacity: 0.3, animation: 'gentlePulse 2s ease-in-out infinite' }} />
      </div>
    );
  }

  const deleteTarget = deleteConfirm ? notes.find(n => n.id === deleteConfirm) : null;

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className="ambient-circle" style={{ top: '-200px', right: '-200px' }} />

      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        notes={notes}
        onSelectNote={(id) => { handleSelect(id); }}
        onNewNote={handleNew}
        onFocusMode={handleFocusMode}
        onTogglePreview={handleTogglePreview}
        onEmail={handleEmail}
        onThemeToggle={handleThemeToggle}
        onPresentation={handlePresentation}
        onTypewriter={handleTypewriter}
        onAi={handleAi}
      />

      {/* Sidebar */}
      <div
        className={`
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          fixed inset-0 z-20 w-full bg-[var(--bg)] transition-all duration-300
          md:relative md:translate-x-0 md:border-r md:border-[var(--border-subtle)]
          ${sidebarCollapsed ? 'md:w-0 md:min-w-0 md:overflow-hidden md:border-r-0' : 'md:w-80 md:min-w-80'}
        `}
        style={{ transitionTimingFunction: 'var(--ease-out)' }}
      >
        <NoteList
          notes={notes}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDeleteRequest}
          onPin={handlePin}
          onImport={handleImport}
          onThemeToggle={handleThemeToggle}
          isDarkTheme={isDark}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 relative">
        {/* Sidebar toggle (desktop) */}
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          className="hidden md:flex absolute top-2 left-2 z-10 toolbar-btn"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {sidebarCollapsed ? (
              <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="14 9 17 12 14 15" /></>
            ) : (
              <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="15 9 12 12 15 15" /></>
            )}
          </svg>
        </button>

        {activeNote ? (
          <Editor
            note={activeNote}
            onChange={handleChange}
            onBack={handleBack}
            onColorChange={handleColorChange}
            onEmail={handleEmail}
            onModeChange={handleModeChange}
            onBlocksChange={handleBlocksChange}
            externalFocusToggle={focusModeFromPalette}
            externalPreviewToggle={togglePreviewFromPalette}
            externalPresentationToggle={presentationFromPalette}
            externalTypewriterToggle={typewriterFromPalette}
            externalAiToggle={aiFromPalette}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-10 md:px-20 py-16 md:py-24 animate-fade-in">
              {/* Hero */}
              <div className="text-center mb-20">
                <div className="enso mx-auto mb-6" style={{ width: 56, height: 56, borderWidth: 2, opacity: 0.2 }} />
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3" style={{ color: 'var(--accent)' }}>
                  ool
                </h1>
                <p className="zen-quote text-base max-w-sm mx-auto">
                  A mindful space for writing,<br />
                  thinking, and creating.
                </p>
              </div>

              {/* Quick start */}
              <div className="mb-14">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium mb-5">Quick start</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-lg mt-0.5" style={{ color: 'var(--accent)' }}>1</span>
                    <div>
                      <p className="text-sm font-medium mb-1">Create a note</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Click the <strong>+</strong> button in the sidebar or press <span className="kbd">Ctrl+N</span></p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-lg mt-0.5" style={{ color: 'var(--accent)' }}>2</span>
                    <div>
                      <p className="text-sm font-medium mb-1">Write in Markdown</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Full markdown support with live preview. Use headings, lists, code blocks, tables, and more.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-lg mt-0.5" style={{ color: 'var(--accent)' }}>3</span>
                    <div>
                      <p className="text-sm font-medium mb-1">Everything saves automatically</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Your notes are stored locally in your browser. No account needed.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features grid */}
              <div className="mb-14">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium mb-5">Features</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "AI Assistant", desc: "Koan helps you write, improve, summarize, and brainstorm" },
                    { title: "Canvas Mode", desc: "Free-form spatial writing. Double-click anywhere to add blocks" },
                    { title: "Focus Mode", desc: "Distraction-free writing with just your words" },
                    { title: "Presentation", desc: "Beautiful read-only view of your notes" },
                    { title: "Note Colors", desc: "Color-code your notes for easy organization" },
                    { title: "Import / Export", desc: "Drag & drop .md files or download your notes" },
                    { title: "Search & Sort", desc: "Find notes quickly by title, content, or color" },
                    { title: "Light & Dark", desc: "Toggle themes from the sidebar footer" },
                  ].map(f => (
                    <div key={f.title} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <p className="text-xs font-semibold mb-1">{f.title}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="mb-14">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium mb-5">Keyboard shortcuts</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                  {[
                    ["Ctrl+N", "New note"],
                    ["Ctrl+K", "Command palette"],
                    ["Ctrl+J", "AI assistant"],
                    ["Ctrl+P", "Toggle preview"],
                    ["Ctrl+Shift+F", "Focus mode"],
                    ["Ctrl+S", "Save indicator"],
                    ["Ctrl+Shift+E", "Email note"],
                    ["Esc", "Exit modes"],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                      <span className="kbd">{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="text-center pb-12">
                <button
                  onClick={handleNew}
                  className="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium rounded-xl bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Start writing
                </button>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-4">
                  or drop .md files into the sidebar to import
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="confirm-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete note?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
              {deleteTarget ? (
                <>&ldquo;{getTitle(deleteTarget)}&rdquo; will be permanently deleted. This cannot be undone.</>
              ) : (
                <>This note will be permanently deleted. This cannot be undone.</>
              )}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--text-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--danger)] text-white hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

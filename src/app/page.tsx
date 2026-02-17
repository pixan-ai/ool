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
  const [mounted, setMounted] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [focusModeFromPalette, setFocusModeFromPalette] = useState(false);
  const [togglePreviewFromPalette, setTogglePreviewFromPalette] = useState(false);
  const [presentationFromPalette, setPresentationFromPalette] = useState(false);
  const [typewriterFromPalette, setTypewriterFromPalette] = useState(false);
  const [aiFromPalette, setAiFromPalette] = useState(false);
  const [isDark, setIsDark] = useState(true);
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
  }, []);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  const handleNew = useCallback(() => {
    const note = createNote();
    setNotes(loadNotes());
    setActiveId(note.id);
    setShowSidebar(false);
  }, []);

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

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote(id);
      const updated = loadNotes();
      setNotes(updated);
      if (activeId === id) {
        setActiveId(updated.length > 0 ? updated[0].id : null);
        if (updated.length === 0) setShowSidebar(true);
      }
    },
    [activeId]
  );

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

      <div
        className={`
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          fixed inset-0 z-20 w-full bg-[var(--bg)] transition-transform duration-300
          md:relative md:translate-x-0 md:w-72 md:min-w-72 md:border-r md:border-[var(--border-subtle)]
        `}
        style={{ transitionTimingFunction: 'var(--ease-out)' }}
      >
        <NoteList
          notes={notes}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDelete}
          onPin={handlePin}
          onImport={handleImport}
          onThemeToggle={handleThemeToggle}
          isDarkTheme={isDark}
        />
      </div>

      <div className="flex-1 min-w-0">
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
            <div className="max-w-2xl mx-auto px-8 md:px-16 py-12 md:py-20 animate-fade-in">
              {/* Hero */}
              <div className="text-center mb-16">
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
              <div className="mb-12">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium mb-4">Quick start</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-lg mt-0.5" style={{ color: 'var(--accent)' }}>1</span>
                    <div>
                      <p className="text-sm font-medium mb-0.5">Create a note</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Click the <strong>+</strong> button in the sidebar or press <span className="kbd">Ctrl+N</span></p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-lg mt-0.5" style={{ color: 'var(--accent)' }}>2</span>
                    <div>
                      <p className="text-sm font-medium mb-0.5">Write in Markdown</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Full markdown support with live preview. Use headings, lists, code blocks, tables, and more.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <span className="text-lg mt-0.5" style={{ color: 'var(--accent)' }}>3</span>
                    <div>
                      <p className="text-sm font-medium mb-0.5">Everything saves automatically</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Your notes are stored locally in your browser. No account needed.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features grid */}
              <div className="mb-12">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium mb-4">Features</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "star", title: "AI Assistant", desc: "Koan helps you write, improve, summarize, and brainstorm" },
                    { icon: "grid", title: "Canvas Mode", desc: "Free-form spatial writing. Double-click anywhere to add blocks" },
                    { icon: "expand", title: "Focus Mode", desc: "Distraction-free writing with just your words" },
                    { icon: "present", title: "Presentation", desc: "Beautiful read-only view of your notes" },
                    { icon: "palette", title: "Note Colors", desc: "Color-code your notes for easy organization" },
                    { icon: "import", title: "Import / Export", desc: "Drag & drop .md files or download your notes" },
                    { icon: "search", title: "Search & Sort", desc: "Find notes quickly by title, content, or color" },
                    { icon: "theme", title: "Light & Dark", desc: "Toggle themes from the sidebar footer" },
                  ].map(f => (
                    <div key={f.title} className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <p className="text-[11px] font-semibold mb-1">{f.title}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="mb-12">
                <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium mb-4">Keyboard shortcuts</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
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
                      <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
                      <span className="kbd">{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="text-center pb-8">
                <button
                  onClick={handleNew}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Start writing
                </button>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-3">
                  or drop .md files into the sidebar to import
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

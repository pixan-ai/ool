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
          <div className="flex h-full items-center justify-center animate-fade-in">
            <div className="text-center">
              <div className="enso mx-auto mb-6" style={{ width: 64, height: 64, borderWidth: 2, opacity: 0.15 }} />
              <p className="zen-quote mb-6 max-w-xs mx-auto">
                The quieter you become,<br />
                the more you can hear.
              </p>
              <button
                onClick={handleNew}
                className="text-[var(--accent)] text-sm hover:text-[var(--accent-hover)] transition-colors"
              >
                Create a note
              </button>
              <div className="mt-8 space-y-2">
                <div className="flex items-center gap-3 justify-center">
                  <span className="kbd">Ctrl+N</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">new note</span>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <span className="kbd">Ctrl+K</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">command palette</span>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <span className="kbd">Ctrl+J</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">AI assistant</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

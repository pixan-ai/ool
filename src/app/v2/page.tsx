"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Note, NoteColor, Theme, SaveStatus, Block } from "./lib/types";
import { BLOCK_DEFAULT_W, BLOCK_DEFAULT_H } from "./lib/grid";
import {
  loadNotes,
  saveNotes,
  createNote,
  loadTheme,
  saveTheme,
} from "./lib/storage";
import Sidebar from "./components/Sidebar";
import Canvas from "./components/Canvas";
import css from "./v2.module.css";

export default function V2Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadNotes();
    setNotes(stored);
    if (stored.length > 0) setActiveId(stored[0].id);
    setTheme(loadTheme());
    setMounted(true);
  }, []);

  // On desktop, sidebar is always visible — reset open state on resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 640) setSidebarOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sorted notes (most recently updated first)
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  // Persist notes with 500ms debounce
  const persistNotes = useCallback((updated: Note[]) => {
    setNotes(updated);
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNotes(updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 600);
    }, 500);
  }, []);

  // --- Note CRUD ---

  const handleCreate = useCallback(() => {
    const note = createNote();
    const updated = [note, ...notes];
    persistNotes(updated);
    setActiveId(note.id);
    setSidebarOpen(false); // close sidebar on mobile after creating
  }, [notes, persistNotes]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDeleteNote = useCallback(() => {
    if (!activeId) return;
    const updated = notes.filter((n) => n.id !== activeId);
    persistNotes(updated);
    setActiveId(updated.length > 0 ? updated[0].id : null);
  }, [activeId, notes, persistNotes]);

  // Generic note updater — avoids repetition across handlers
  const updateActiveNote = useCallback(
    (updater: (note: Note) => Partial<Note>) => {
      if (!activeId) return;
      const updated = notes.map((n) =>
        n.id === activeId
          ? { ...n, ...updater(n), updatedAt: Date.now() }
          : n
      );
      persistNotes(updated);
    },
    [activeId, notes, persistNotes]
  );

  const handleUpdateTitle = useCallback(
    (title: string) => updateActiveNote(() => ({ title })),
    [updateActiveNote]
  );

  const handleUpdateContent = useCallback(
    (content: string) => updateActiveNote(() => ({ content })),
    [updateActiveNote]
  );

  const handleUpdateColor = useCallback(
    (color: NoteColor) => updateActiveNote(() => ({ color })),
    [updateActiveNote]
  );

  // --- Block operations ---

  const handleAddBlock = useCallback(
    (x: number, y: number) => {
      updateActiveNote((note) => {
        const newBlock: Block = {
          id: crypto.randomUUID(),
          content: "",
          x,
          y,
          width: BLOCK_DEFAULT_W,
          height: BLOCK_DEFAULT_H,
        };
        return { blocks: [...note.blocks, newBlock] };
      });
    },
    [updateActiveNote]
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, content: string) => {
      updateActiveNote((note) => ({
        blocks: note.blocks.map((b) =>
          b.id === blockId ? { ...b, content } : b
        ),
      }));
    },
    [updateActiveNote]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      updateActiveNote((note) => ({
        blocks: note.blocks.filter((b) => b.id !== blockId),
      }));
    },
    [updateActiveNote]
  );

  // --- Theme ---

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      saveTheme(next);
      return next;
    });
  }, []);

  // --- Keyboard shortcuts ---

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
        setSidebarOpen(false);
        return;
      }

      if (isTyping) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleCreate();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setSidebarOpen(true);
        // Wait for sidebar to render before focusing
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreate]);

  if (!mounted) {
    return (
      <div className={css.root} suppressHydrationWarning>
        <div className={css.empty} />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div
      className={css.root}
      data-dark={isDark ? "" : undefined}
      suppressHydrationWarning
    >
      {/* Mobile backdrop — tap to close sidebar */}
      {sidebarOpen && (
        <div
          className={css.backdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        notes={sortedNotes}
        activeId={activeId}
        theme={theme}
        isOpen={sidebarOpen}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onClose={() => setSidebarOpen(false)}
        onToggleTheme={handleToggleTheme}
        searchRef={searchRef}
      />

      {activeNote ? (
        <Canvas
          note={activeNote}
          saveStatus={saveStatus}
          isDark={isDark}
          onMenuOpen={() => setSidebarOpen(true)}
          onUpdateTitle={handleUpdateTitle}
          onUpdateContent={handleUpdateContent}
          onUpdateColor={handleUpdateColor}
          onAddBlock={handleAddBlock}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          onDeleteNote={handleDeleteNote}
        />
      ) : (
        <div className={css.empty}>
          <span className={css.emptyIcon}>📝</span>
          <span className={css.emptyTitle}>No note selected</span>
          <span className={css.emptyHint}>
            Press <kbd>N</kbd> to create one
          </span>
        </div>
      )}
    </div>
  );
}

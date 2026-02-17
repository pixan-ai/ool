"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Note, NoteColor } from "@/lib/types";
import { loadNotes, createNote, updateNote, updateNoteColor, deleteNote, getTitle } from "@/lib/notes";
import NoteList from "@/components/NoteList";
import Editor from "@/components/Editor";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mounted, setMounted] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }
    setMounted(true);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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

  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  const handleEmail = useCallback(() => {
    if (!activeNote) return;
    const title = getTitle(activeNote);
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(activeNote.content);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [activeNote]);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="enso" style={{ width: 40, height: 40, opacity: 0.3, animation: 'gentlePulse 2s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Ambient breathing circle */}
      <div className="ambient-circle" style={{ top: '-200px', right: '-200px' }} />

      {/* Sidebar */}
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
        />
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0">
        {activeNote ? (
          <Editor
            note={activeNote}
            onChange={handleChange}
            onBack={handleBack}
            onColorChange={handleColorChange}
            onEmail={handleEmail}
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
              <div className="mt-6 flex items-center gap-3 justify-center">
                <span className="kbd">Ctrl+N</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">new note</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

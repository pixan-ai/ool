"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Note } from "@/lib/types";
import { loadNotes, createNote, updateNote, deleteNote } from "@/lib/notes";
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
      // Update local state immediately for responsive UI
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId ? { ...n, content, updatedAt: Date.now() } : n
        )
      );
      // Debounce localStorage write
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updateNote(activeId, content);
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

  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[var(--text-secondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          fixed inset-0 z-20 w-full bg-[var(--bg)] transition-transform duration-200
          md:relative md:translate-x-0 md:w-72 md:min-w-72 md:border-r md:border-[var(--border)]
        `}
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
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-[var(--text-secondary)] text-sm mb-3">
                No notes yet
              </p>
              <button
                onClick={handleNew}
                className="text-[var(--accent)] text-sm hover:underline"
              >
                Create your first note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

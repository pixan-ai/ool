"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Note, NoteColor } from "@/lib/types";
import { loadNotes, createNote, updateNote, deleteNote, getTitle } from "@/lib/notes";
import NoteList from "@/components/NoteList";
import Editor from "@/components/Editor";

const THEME_KEY = "ool-theme";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
    if (localStorage.getItem(THEME_KEY) === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  const activeNote = notes.find(n => n.id === activeId) || null;
  const deleteTarget = notes.find(n => n.id === deleteConfirm);

  const handleNew = useCallback(() => {
    const note = createNote();
    setNotes(loadNotes());
    setActiveId(note.id);
    setShowSidebar(false);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); handleNew(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleNew]);

  const handleChange = useCallback((content: string) => {
    if (!activeId) return;
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, content, updatedAt: Date.now() } : n));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateNote(activeId, { content }), 300);
  }, [activeId]);

  const handleColorChange = useCallback((color: NoteColor) => {
    if (!activeId) return;
    updateNote(activeId, { color });
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, color } : n));
  }, [activeId]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return;
    deleteNote(deleteConfirm);
    const updated = loadNotes();
    setNotes(updated);
    if (activeId === deleteConfirm) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
      if (!updated.length) setShowSidebar(true);
    }
    setDeleteConfirm(null);
  }, [activeId, deleteConfirm]);

  const handlePin = useCallback((id: string) => {
    updateNote(id, { pinned: !notes.find(n => n.id === id)?.pinned });
    setNotes(loadNotes());
  }, [notes]);

  const handleThemeToggle = useCallback(() => {
    setIsDark(prev => {
      const d = !prev;
      document.documentElement.classList.toggle("light", !d);
      document.documentElement.classList.toggle("dark", d);
      localStorage.setItem(THEME_KEY, d ? "dark" : "light");
      return d;
    });
  }, []);

  const handleEmail = useCallback(() => {
    if (!activeNote) return;
    const subject = encodeURIComponent(getTitle(activeNote));
    const body = encodeURIComponent(activeNote.content);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [activeNote]);

  const handleBlocksChange = useCallback((blocks: import("@/lib/types").FloatingBlock[]) => {
    if (!activeId) return;
    updateNote(activeId, { blocks });
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, blocks } : n));
  }, [activeId]);

  if (!mounted) return <div className="fixed inset-0 bg-[var(--bg)]" />;

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Sidebar */}
      <div className={`
        ${showSidebar ? "translate-x-0" : "-translate-x-full"}
        fixed inset-0 z-20 w-full bg-[var(--bg)] transition-all duration-300
        md:relative md:translate-x-0 md:border-r md:border-[var(--border-subtle)]
        ${sidebarCollapsed ? "md:w-0 md:min-w-0 md:overflow-hidden md:border-r-0" : "md:w-80 md:min-w-80"}
      `}>
        <NoteList
          notes={notes} activeId={activeId}
          onSelect={(id) => { setActiveId(id); setShowSidebar(false); }}
          onNew={handleNew} onDelete={setDeleteConfirm} onPin={handlePin}
          onImport={() => setNotes(loadNotes())}
          onThemeToggle={handleThemeToggle} isDarkTheme={isDark}
        />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 relative">
        <div className="hidden md:block absolute top-2 left-2 z-10">
        <button onClick={() => setSidebarCollapsed(c => !c)}
          className="toolbar-btn"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarCollapsed
              ? <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="14 9 17 12 14 15" /></>
              : <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="15 9 12 12 15 15" /></>
            }
          </svg>
        </button>
        </div>

        {activeNote ? (
          <Editor note={activeNote} onChange={handleChange} onBlocksChange={handleBlocksChange} onBack={() => setShowSidebar(true)} onColorChange={handleColorChange} onEmail={handleEmail} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center px-10 animate-fade-in">
            <div className="enso mx-auto mb-6" style={{ width: 56, height: 56, borderWidth: 2, opacity: 0.2 }} />
            <h1 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: "var(--accent)" }}>ool</h1>
            <p className="zen-quote text-sm mb-8">A mindful space for writing.</p>
            <button onClick={handleNew} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              Start writing
            </button>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteConfirm && (
        <div className="confirm-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete note?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-5">
              {deleteTarget ? <>&ldquo;{getTitle(deleteTarget)}&rdquo; will be permanently deleted.</> : <>This note will be permanently deleted.</>}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">Cancel</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--danger)] text-white hover:opacity-90 transition-opacity">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

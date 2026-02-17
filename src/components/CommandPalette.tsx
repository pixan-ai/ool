"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Note } from "@/lib/types";
import { getTitle } from "@/lib/notes";

interface Command {
  id: string;
  label: string;
  hint?: string;
  section: string;
  action: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onFocusMode: () => void;
  onTogglePreview: () => void;
  onEmail: () => void;
  onThemeToggle: () => void;
  onPresentation: () => void;
  onTypewriter: () => void;
  onAi: () => void;
}

export default function CommandPalette({
  open, onClose, notes, onSelectNote, onNewNote,
  onFocusMode, onTogglePreview, onEmail,
  onThemeToggle, onPresentation, onTypewriter, onAi,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      { id: "new", label: "New note", hint: "Ctrl+N", section: "Actions", action: onNewNote },
      { id: "ai", label: "AI assistant (Koan)", hint: "Ctrl+J", section: "Actions", action: onAi },
      { id: "focus", label: "Toggle focus mode", hint: "Ctrl+Shift+F", section: "Actions", action: onFocusMode },
      { id: "preview", label: "Toggle preview", hint: "Ctrl+P", section: "Actions", action: onTogglePreview },
      { id: "present", label: "Presentation mode", section: "Actions", action: onPresentation },
      { id: "typewriter", label: "Toggle typewriter mode", section: "Actions", action: onTypewriter },
      { id: "theme", label: "Toggle light/dark theme", section: "Actions", action: onThemeToggle },
      { id: "email", label: "Share via email", hint: "Ctrl+Shift+E", section: "Actions", action: onEmail },
    ];
    notes.forEach(n => {
      cmds.push({
        id: `note-${n.id}`,
        label: getTitle(n),
        section: "Notes",
        action: () => onSelectNote(n.id),
      });
    });
    return cmds;
  }, [notes, onNewNote, onFocusMode, onTogglePreview, onEmail, onSelectNote, onThemeToggle, onPresentation, onTypewriter, onAi]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  const sections: Record<string, Command[]> = {};
  filtered.forEach(c => {
    if (!sections[c.section]) sections[c.section] = [];
    sections[c.section].push(c);
  });

  let flatIndex = 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} style={{ animation: 'fadeIn 150ms ease-out' }} />

      <div
        className="fixed z-50 top-[20%] left-1/2 -translate-x-1/2 w-full max-w-md animate-slide-up"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Search commands and notes..."
              className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-tertiary)]"
              autoComplete="off"
            />
            <span className="kbd">Esc</span>
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[var(--text-tertiary)] text-sm">
                No results found
              </div>
            ) : (
              Object.entries(sections).map(([section, cmds]) => (
                <div key={section}>
                  <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                    {section}
                  </div>
                  {cmds.map(cmd => {
                    const idx = flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => { cmd.action(); onClose(); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                          idx === selectedIndex
                            ? 'bg-[var(--accent-subtle)] text-[var(--text)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <span className="truncate">
                          {section === "Notes" && (
                            <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: 'var(--text-tertiary)' }} />
                          )}
                          {cmd.id === "ai" && (
                            <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: 'var(--accent)' }} />
                          )}
                          {cmd.label}
                        </span>
                        {cmd.hint && <span className="kbd ml-2 shrink-0">{cmd.hint}</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

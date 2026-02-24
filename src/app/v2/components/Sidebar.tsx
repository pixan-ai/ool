"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Note, Theme } from "../lib/types";
import { COLOR_VALUES } from "../lib/types";
import { relativeTime } from "../lib/storage";
import css from "./Sidebar.module.css";

interface SidebarProps {
  notes: Note[];
  activeId: string | null;
  theme: Theme;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export default function Sidebar({
  notes,
  activeId,
  theme,
  isOpen,
  onSelect,
  onCreate,
  onClose,
  onToggleTheme,
  searchRef,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.toLowerCase().trim());
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filtered = debouncedQuery
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(debouncedQuery) ||
          n.content.toLowerCase().includes(debouncedQuery)
      )
    : notes;

  const isDark = theme === "dark";

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      onClose(); // close sidebar on mobile after selecting a note
    },
    [onSelect, onClose]
  );

  return (
    <aside
      className={`${css.sidebar} ${isOpen ? css.sidebarOpen : ""}`}
    >
      <div className={css.header}>
        <div className={css.logo}>
          <span className={css.logoDot} />
          noter.sh
        </div>
        <div className={css.headerRight}>
          <button
            className={css.newBtn}
            onClick={onCreate}
            title="New note (N)"
          >
            +
          </button>
          <button
            className={css.closeBtn}
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
      </div>

      <div className={css.search}>
        <input
          ref={searchRef}
          type="text"
          className={css.searchInput}
          placeholder="Search notes..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className={css.list}>
        {filtered.map((note) => {
          const isActive = note.id === activeId;
          const colorVal = isDark
            ? COLOR_VALUES[note.color].dark
            : COLOR_VALUES[note.color].light;

          return (
            <div
              key={note.id}
              className={isActive ? css.noteItemActive : css.noteItem}
              onClick={() => handleSelect(note.id)}
            >
              <span
                className={css.colorDot}
                style={{ background: colorVal }}
              />
              <div className={css.noteInfo}>
                <div className={css.noteTitle}>
                  {note.title || "Untitled"}
                </div>
                <div className={css.noteTime}>
                  {relativeTime(note.updatedAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={css.footer}>
        <span>
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
        <button
          className={css.themeBtn}
          onClick={onToggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>
    </aside>
  );
}

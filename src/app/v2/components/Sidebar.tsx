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
  onSelect: (id: string) => void;
  onCreate: () => void;
  onToggleTheme: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export default function Sidebar({
  notes,
  activeId,
  theme,
  onSelect,
  onCreate,
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

  // Cleanup debounce on unmount
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

  return (
    <aside className={css.sidebar}>
      <div className={css.header}>
        <div className={css.logo}>
          <span className={css.logoDot} />
          noter.sh
        </div>
        <button className={css.newBtn} onClick={onCreate} title="New note (N)">
          +
        </button>
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
              onClick={() => onSelect(note.id)}
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
        <span>{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        <button
          className={css.themeBtn}
          onClick={onToggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
        </button>
      </div>
    </aside>
  );
}

"use client";

import type { Note, Theme, NoteColor } from "./types";

const NOTES_KEY = "noter_notes";
const THEME_KEY = "noter_theme";

// --- Notes ---

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Note[];
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function createNote(
  title = "Untitled",
  color: NoteColor = "stone"
): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    content: "",
    color,
    blocks: [],
    updatedAt: now,
    createdAt: now,
  };
}

// --- Theme ---

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const val = localStorage.getItem(THEME_KEY);
    return val === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}

// --- Formatting helpers ---

/** Human-friendly relative time: "just now", "2m ago", "1h ago", "3d ago" */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Count words in a string */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

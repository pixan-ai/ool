import { Note } from "./types";

const STORAGE_KEY = "ool-notes";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createNote(): Note {
  const notes = loadNotes();
  const note: Note = {
    id: generateId(),
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  notes.unshift(note);
  saveNotes(notes);
  return note;
}

export function updateNote(id: string, content: string): Note | null {
  const notes = loadNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  notes[index].content = content;
  notes[index].updatedAt = Date.now();
  saveNotes(notes);
  return notes[index];
}

export function deleteNote(id: string): void {
  const notes = loadNotes();
  saveNotes(notes.filter((n) => n.id !== id));
}

export function getTitle(note: Note): string {
  const firstLine = note.content.split("\n")[0]?.trim();
  if (!firstLine) return "Untitled";
  // Strip markdown heading markers
  return firstLine.replace(/^#+\s*/, "") || "Untitled";
}

export function getPreview(note: Note): string {
  const lines = note.content.split("\n").filter((l) => l.trim());
  const second = lines[1]?.trim() || "";
  // Strip markdown formatting for preview
  return second.replace(/[#*_~`>\-[\]()]/g, "").trim() || "No content";
}

export function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

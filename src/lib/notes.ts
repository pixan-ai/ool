import { Note, NoteColor, CanvasBlock } from "./types";

const STORAGE_KEY = "ool-notes";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export { generateId };

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const notes = JSON.parse(raw) as Note[];
    return notes.map(n => ({
      ...n,
      color: n.color || 'stone',
      mode: n.mode || 'markdown',
    }));
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createNote(color: NoteColor = 'stone'): Note {
  const notes = loadNotes();
  const note: Note = {
    id: generateId(),
    content: "",
    color,
    mode: 'markdown',
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

export function updateNoteColor(id: string, color: NoteColor): Note | null {
  const notes = loadNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  notes[index].color = color;
  notes[index].updatedAt = Date.now();
  saveNotes(notes);
  return notes[index];
}

export function updateNoteMode(id: string, mode: 'markdown' | 'canvas'): Note | null {
  const notes = loadNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  notes[index].mode = mode;
  notes[index].updatedAt = Date.now();
  saveNotes(notes);
  return notes[index];
}

export function updateNoteBlocks(id: string, blocks: CanvasBlock[]): Note | null {
  const notes = loadNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  notes[index].blocks = blocks;
  notes[index].updatedAt = Date.now();
  saveNotes(notes);
  return notes[index];
}

export function deleteNote(id: string): void {
  const notes = loadNotes();
  saveNotes(notes.filter((n) => n.id !== id));
}

export function getTitle(note: Note): string {
  if (note.mode === 'canvas' && note.blocks?.length) {
    const first = note.blocks[0].content.split("\n")[0]?.trim();
    if (first) return first.replace(/^#+\s*/, "") || "Canvas";
    return "Canvas";
  }
  const firstLine = note.content.split("\n")[0]?.trim();
  if (!firstLine) return "Untitled";
  return firstLine.replace(/^#+\s*/, "") || "Untitled";
}

export function getPreview(note: Note): string {
  if (note.mode === 'canvas') {
    const count = note.blocks?.length || 0;
    return count > 0 ? `${count} block${count !== 1 ? 's' : ''}` : "";
  }
  const lines = note.content.split("\n").filter((l) => l.trim());
  const second = lines[1]?.trim() || "";
  return second.replace(/[#*_~`>\-[\]()]/g, "").trim() || "";
}

export function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getWordCount(content: string): number {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

export function getCharCount(content: string): number {
  return content.length;
}

export function searchNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;
  const q = query.toLowerCase();
  return notes.filter(n => {
    if (n.content.toLowerCase().includes(q)) return true;
    if (n.blocks?.some(b => b.content.toLowerCase().includes(q))) return true;
    return false;
  });
}

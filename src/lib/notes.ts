import { Note, NoteColor, SortMode } from "./types";

const KEY = "ool-notes";
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Note[]).map(n => ({
      ...n, color: n.color || "stone", pinned: n.pinned || false,
    })) : [];
  } catch { return []; }
}

function save(notes: Note[]) { localStorage.setItem(KEY, JSON.stringify(notes)); }

export function createNote(color: NoteColor = "stone"): Note {
  const note: Note = { id: id(), content: "", color, pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
  save([note, ...loadNotes()]);
  return note;
}

export function updateNote(noteId: string, patch: Partial<Pick<Note, "content" | "color" | "pinned">>): Note | null {
  const notes = loadNotes();
  const i = notes.findIndex(n => n.id === noteId);
  if (i === -1) return null;
  notes[i] = { ...notes[i], ...patch, updatedAt: Date.now() };
  save(notes);
  return notes[i];
}

export function deleteNote(noteId: string) {
  save(loadNotes().filter(n => n.id !== noteId));
}

export function importNote(content: string, color: NoteColor = "stone"): Note {
  const note: Note = { id: id(), content, color, pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
  save([note, ...loadNotes()]);
  return note;
}

export function getTitle(note: Note): string {
  const line = note.content.split("\n").find(l => l.trim());
  if (!line) return "Untitled";
  return line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/[*_~`]/g, "").trim().slice(0, 60) || "Untitled";
}

export function getPreview(note: Note): string {
  const lines = note.content.split("\n").filter(l => l.trim());
  return (lines[1] || lines[0] || "").replace(/[#*_~`>\-[\]()]/g, "").trim().slice(0, 100);
}

export function formatDate(ts: number): string {
  const d = new Date(ts), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

export const getWordCount = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0;
export const getReadingTime = (w: number) => w < 200 ? "<1 min" : `${Math.ceil(w / 200)} min`;

export function getHeadings(content: string) {
  return content.split("\n").map((l, i) => {
    const m = l.match(/^(#{1,4})\s+(.+)/);
    return m ? { level: m[1].length, text: m[2].trim(), line: i } : null;
  }).filter(Boolean) as { level: number; text: string; line: number }[];
}

export function searchNotes(notes: Note[], q: string): Note[] {
  const lower = q.toLowerCase();
  return notes.filter(n => n.content.toLowerCase().includes(lower));
}

export function sortNotes(notes: Note[], mode: SortMode): Note[] {
  const pinned = notes.filter(n => n.pinned), unpinned = notes.filter(n => !n.pinned);
  const colorOrder = ["stone", "green", "red", "pink", "grey", "sand", "sky", "lavender"];
  const sorters: Record<SortMode, (a: Note, b: Note) => number> = {
    modified: (a, b) => b.updatedAt - a.updatedAt,
    created: (a, b) => b.createdAt - a.createdAt,
    alpha: (a, b) => getTitle(a).localeCompare(getTitle(b)),
    color: (a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color),
  };
  return [...pinned.sort(sorters[mode]), ...unpinned.sort(sorters[mode])];
}

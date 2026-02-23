// All TypeScript interfaces for noter.sh v2 prototype

export type NoteColor =
  | "stone"
  | "green"
  | "red"
  | "pink"
  | "sand"
  | "sky"
  | "lavender";

export const NOTE_COLORS: NoteColor[] = [
  "stone",
  "green",
  "red",
  "pink",
  "sand",
  "sky",
  "lavender",
];

// Color mappings for dot indicators and accents
export const COLOR_VALUES: Record<NoteColor, { light: string; dark: string }> = {
  stone:    { light: "#78716c", dark: "#a8a29e" },
  green:    { light: "#16a34a", dark: "#4ade80" },
  red:      { light: "#dc2626", dark: "#f87171" },
  pink:     { light: "#db2777", dark: "#f472b6" },
  sand:     { light: "#b45309", dark: "#fbbf24" },
  sky:      { light: "#0284c7", dark: "#38bdf8" },
  lavender: { light: "#7c3aed", dark: "#a78bfa" },
};

export interface Block {
  id: string;
  content: string;
  x: number;       // grid units
  y: number;       // grid units
  width: number;   // grid units, default 10
  height: number;  // grid units, default 4
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  blocks: Block[];
  updatedAt: number;
  createdAt: number;
}

export type Theme = "light" | "dark";

// Save status for the indicator dot
export type SaveStatus = "saved" | "saving" | "idle";

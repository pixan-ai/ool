export type NoteColor = 'stone' | 'green' | 'red' | 'pink' | 'grey' | 'sand' | 'sky' | 'lavender';
export type SortMode = 'modified' | 'created' | 'alpha' | 'color';

export interface Note {
  id: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_COLORS: Record<NoteColor, { label: string; bg: string; dot: string }> = {
  stone:    { label: "Stone",    bg: "transparent",       dot: "#8a8880" },
  green:    { label: "Green",    bg: "rgba(125,154,120,0.04)", dot: "#7d9a78" },
  red:      { label: "Red",      bg: "rgba(196,125,125,0.04)", dot: "#c47d7d" },
  pink:     { label: "Pink",     bg: "rgba(196,140,180,0.04)", dot: "#c48cb4" },
  grey:     { label: "Grey",     bg: "rgba(150,150,150,0.04)", dot: "#969696" },
  sand:     { label: "Sand",     bg: "rgba(196,168,130,0.04)", dot: "#c4a882" },
  sky:      { label: "Sky",      bg: "rgba(130,170,196,0.04)", dot: "#82aac4" },
  lavender: { label: "Lavender", bg: "rgba(160,140,196,0.04)", dot: "#a08cc4" },
};

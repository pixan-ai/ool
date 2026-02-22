export type NoteColor = 'stone' | 'bamboo' | 'sakura' | 'sumi' | 'kincha' | 'sora' | 'fuji';

export type SortMode = 'date' | 'title' | 'color';

export interface CanvasBlock {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  content: string;
  width: number; // percentage 0-100
}

export interface Note {
  id: string;
  content: string;
  color: NoteColor;
  mode: 'markdown' | 'canvas';
  blocks?: CanvasBlock[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_COLORS: Record<NoteColor, { label: string; bg: string; accent: string; dot: string }> = {
  stone:  { label: '石',   bg: 'rgba(200,200,195,0.04)', accent: '#8a8884', dot: '#8a8884' },
  bamboo: { label: '竹',   bg: 'rgba(125,154,120,0.06)', accent: '#7d9a78', dot: '#7d9a78' },
  sakura: { label: '桜',   bg: 'rgba(196,136,154,0.06)', accent: '#c4889a', dot: '#c4889a' },
  sumi:   { label: '墨',   bg: 'rgba(60,60,65,0.08)',    accent: '#6a6a70', dot: '#6a6a70' },
  kincha: { label: '金茶', bg: 'rgba(196,168,130,0.06)', accent: '#c4a882', dot: '#c4a882' },
  sora:   { label: '空',   bg: 'rgba(125,154,184,0.06)', accent: '#7d9ab8', dot: '#7d9ab8' },
  fuji:   { label: '藤',   bg: 'rgba(154,125,184,0.06)', accent: '#9a7db8', dot: '#9a7db8' },
};

export const NOTE_COLORS_LIGHT: Record<NoteColor, { bg: string; dot: string }> = {
  stone:  { bg: 'rgba(140,140,135,0.06)', dot: '#7a7874' },
  bamboo: { bg: 'rgba(90,130,85,0.08)',   dot: '#5a8a50' },
  sakura: { bg: 'rgba(180,100,120,0.08)', dot: '#b06880' },
  sumi:   { bg: 'rgba(60,60,65,0.06)',    dot: '#5a5a60' },
  kincha: { bg: 'rgba(160,130,90,0.08)',  dot: '#9a8060' },
  sora:   { bg: 'rgba(90,130,170,0.08)',  dot: '#5a8ab0' },
  fuji:   { bg: 'rgba(130,90,160,0.08)',  dot: '#8a60b0' },
};


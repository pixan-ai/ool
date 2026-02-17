export type NoteColor = 'stone' | 'bamboo' | 'sakura' | 'sumi' | 'kincha' | 'sora' | 'fuji';

export interface Note {
  id: string;
  content: string;
  color: NoteColor;
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

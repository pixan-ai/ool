"use client";

import { useCallback, useRef } from "react";
import type { Note, NoteColor, SaveStatus } from "../lib/types";
import { NOTE_COLORS, COLOR_VALUES } from "../lib/types";
import { findFreePosition, snapToGrid, BLOCK_DEFAULT_W, BLOCK_DEFAULT_H } from "../lib/grid";
import { wordCount } from "../lib/storage";
import Block from "./Block";
import css from "./Canvas.module.css";

interface CanvasProps {
  note: Note;
  saveStatus: SaveStatus;
  isDark: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateContent: (content: string) => void;
  onUpdateColor: (color: NoteColor) => void;
  onAddBlock: (x: number, y: number) => void;
  onUpdateBlock: (blockId: string, content: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onDeleteNote: () => void;
}

export default function Canvas({
  note,
  saveStatus,
  isDark,
  onUpdateTitle,
  onUpdateContent,
  onUpdateColor,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDeleteNote,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleAddBlockBtn = useCallback(() => {
    const pos = findFreePosition(note.blocks);
    onAddBlock(pos.x, pos.y);
  }, [note.blocks, onAddBlock]);

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only trigger on the canvas background, not on blocks or inputs
      const target = e.target as HTMLElement;
      if (target !== e.currentTarget && !target.classList.contains(css.canvasInner)) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
      const scrollTop = canvasRef.current?.scrollTop ?? 0;

      const x = snapToGrid(e.clientX - rect.left + scrollLeft);
      const y = snapToGrid(e.clientY - rect.top + scrollTop);
      onAddBlock(x, y);
    },
    [onAddBlock]
  );

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete "${note.title || "Untitled"}"?`)) {
      onDeleteNote();
    }
  }, [note.title, onDeleteNote]);

  const words = wordCount(note.title + " " + note.content);
  const isSaving = saveStatus === "saving";

  return (
    <div className={css.wrapper}>
      {/* Toolbar */}
      <div className={css.toolbar}>
        {NOTE_COLORS.map((c) => {
          const val = isDark ? COLOR_VALUES[c].dark : COLOR_VALUES[c].light;
          return (
            <button
              key={c}
              className={`${css.colorSwatch} ${note.color === c ? css.colorSwatchActive : ""}`}
              style={{ background: val }}
              onClick={() => onUpdateColor(c)}
              title={c}
              aria-label={`Set color to ${c}`}
            />
          );
        })}

        <div className={css.toolbarSep} />

        <button className={css.addBlockBtn} onClick={handleAddBlockBtn}>
          + Block
        </button>

        <div className={css.toolbarRight}>
          <div className={`${css.saveDot} ${isSaving ? css.saveDotSaving : ""}`} />
          <button className={css.deleteBtn} onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {/* Dot-grid canvas */}
      <div
        ref={canvasRef}
        className={css.canvas}
        onDoubleClick={handleCanvasDoubleClick}
      >
        <div className={css.canvasInner}>
          <input
            className={css.titleInput}
            type="text"
            value={note.title}
            placeholder="Note title..."
            onChange={(e) => onUpdateTitle(e.target.value)}
          />
          <textarea
            className={css.bodyInput}
            value={note.content}
            placeholder="Start writing..."
            onChange={(e) => onUpdateContent(e.target.value)}
            rows={6}
          />

          {/* Floating blocks */}
          {note.blocks.map((block) => (
            <Block
              key={block.id}
              block={block}
              onChange={onUpdateBlock}
              onDelete={onDeleteBlock}
            />
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className={css.statusBar}>
        <div className={`${css.statusDot} ${isSaving ? css.statusDotSaving : ""}`} />
        <span>{words} word{words !== 1 ? "s" : ""}</span>
        <span>{note.blocks.length} block{note.blocks.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

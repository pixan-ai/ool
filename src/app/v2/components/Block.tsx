"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { Block as BlockType } from "../lib/types";
import { gridToPx, GRID_UNIT } from "../lib/grid";
import css from "./Block.module.css";

interface BlockProps {
  block: BlockType;
  onChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export default function Block({ block, onChange, onDelete }: BlockProps) {
  const [exiting, setExiting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus on mount for newly created blocks
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleBlur = useCallback(() => {
    // Grace period: auto-delete empty blocks 300ms after blur
    blurTimerRef.current = setTimeout(() => {
      if (!block.content.trim()) {
        setExiting(true);
        setTimeout(() => onDelete(block.id), 160);
      }
    }, 300);
  }, [block.content, block.id, onDelete]);

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  const handleDelete = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDelete(block.id), 160);
  }, [block.id, onDelete]);

  const style: React.CSSProperties = {
    left: gridToPx(block.x),
    top: gridToPx(block.y),
    width: gridToPx(block.width),
    minHeight: gridToPx(block.height),
  };

  return (
    <div
      className={`${css.block} ${exiting ? css.blockExiting : ""}`}
      style={style}
    >
      <div className={css.header}>
        <span className={css.handle}>···</span>
        <button
          className={css.deleteBtn}
          onClick={handleDelete}
          aria-label="Delete block"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className={css.textarea}
        value={block.content}
        placeholder="Write something..."
        onChange={(e) => onChange(block.id, e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
    </div>
  );
}

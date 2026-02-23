"use client";

import { useState, useEffect, useCallback } from "react";
import { FloatingBlock } from "@/lib/types";
import { genId } from "@/lib/notes";
import BlockEditor from "./BlockEditor";

interface Props {
  blocks: FloatingBlock[];
  onChange: (blocks: FloatingBlock[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  newBlockId: string | null;
}

export default function FloatingBlocks({ blocks, onChange, containerRef, newBlockId }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Update block content
  const updateBlock = useCallback((id: string, content: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  }, [blocks, onChange]);

  // Delete empty block
  const removeBlock = useCallback((id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  }, [blocks, onChange]);

  // Mouse drag start
  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest(".block-editor")) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const rect = container.getBoundingClientRect();
    const bx = (block.x / 100) * container.scrollWidth;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - rect.left + container.scrollLeft - bx, y: e.clientY - rect.top + container.scrollTop - block.y });
  }, [blocks, containerRef]);

  // Mouse drag move/end
  useEffect(() => {
    if (!draggingId) return;
    const handleMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left + container.scrollLeft - dragOffset.x) / container.scrollWidth) * 100;
      const y = e.clientY - rect.top + container.scrollTop - dragOffset.y;
      onChange(blocks.map(b => b.id === draggingId
        ? { ...b, x: Math.max(0, Math.min(80, x)), y: Math.max(0, y) } : b));
    };
    const handleUp = () => setDraggingId(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [draggingId, dragOffset, blocks, onChange, containerRef]);

  // Touch drag
  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    if ((e.target as HTMLElement).closest(".block-editor")) return;
    const container = containerRef.current;
    if (!container) return;
    const touch = e.touches[0];
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const rect = container.getBoundingClientRect();
    const bx = (block.x / 100) * container.scrollWidth;
    setDraggingId(id);
    setDragOffset({ x: touch.clientX - rect.left + container.scrollLeft - bx, y: touch.clientY - rect.top + container.scrollTop - block.y });
  }, [blocks, containerRef]);

  useEffect(() => {
    if (!draggingId) return;
    const handleMove = (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = ((touch.clientX - rect.left + container.scrollLeft - dragOffset.x) / container.scrollWidth) * 100;
      const y = touch.clientY - rect.top + container.scrollTop - dragOffset.y;
      onChange(blocks.map(b => b.id === draggingId
        ? { ...b, x: Math.max(0, Math.min(80, x)), y: Math.max(0, y) } : b));
    };
    const handleEnd = () => setDraggingId(null);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => { window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleEnd); };
  }, [draggingId, dragOffset, blocks, onChange, containerRef]);

  return (
    <>
      {blocks.map(block => (
        <div key={block.id}
          className={`floating-block ${draggingId === block.id ? "dragging" : ""}`}
          style={{ left: `${block.x}%`, top: `${block.y}px`, width: `${block.width}px`, minWidth: 140 }}
          onMouseDown={(e) => handleDragStart(e, block.id)}
          onTouchStart={(e) => handleTouchStart(e, block.id)}
        >
          <div className="floating-block-handle">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </div>
          <div className="floating-block-editor">
            <BlockEditor
              content={block.content}
              onChange={(md) => updateBlock(block.id, md)}
              onEmpty={() => removeBlock(block.id)}
              autoFocus={block.id === newBlockId}
            />
          </div>
        </div>
      ))}
    </>
  );
}

export function createBlock(containerRef: React.RefObject<HTMLDivElement | null>, blocks: FloatingBlock[]): { blocks: FloatingBlock[]; newId: string } {
  const container = containerRef.current;
  const scrollTop = container?.scrollTop || 0;
  const w = container?.clientWidth || 400;
  const h = container?.clientHeight || 600;
  const x = Math.max(5, Math.min(50, ((w * 0.3) / (container?.scrollWidth || w)) * 100 + Math.random() * 20));
  const y = scrollTop + h * 0.3 + Math.random() * 100;
  const id = genId();
  return { blocks: [...blocks, { id, x, y, content: "", width: Math.min(280, w * 0.6) }], newId: id };
}

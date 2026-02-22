"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FloatingBlock } from "@/lib/types";
import { genId } from "@/lib/notes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  blocks: FloatingBlock[];
  onChange: (blocks: FloatingBlock[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function FloatingBlocks({ blocks, onChange, containerRef }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingId) {
      const ta = textareaRefs.current.get(editingId);
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; }
    }
  }, [editingId]);

  // Update block content
  const updateBlock = useCallback((id: string, content: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  }, [blocks, onChange]);

  // Delete if empty on blur
  const handleBlur = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block && !block.content.trim()) onChange(blocks.filter(b => b.id !== id));
    setEditingId(null);
  }, [blocks, onChange]);

  // Key handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    const block = blocks.find(b => b.id === id);
    if (e.key === "Backspace" && block && !block.content) {
      e.preventDefault(); onChange(blocks.filter(b => b.id !== id)); setEditingId(null);
    }
    if (e.key === "Escape") setEditingId(null);
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget as HTMLTextAreaElement;
      const s = t.selectionStart, end = t.selectionEnd;
      updateBlock(id, t.value.substring(0, s) + "  " + t.value.substring(end));
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
    }
  }, [blocks, onChange, updateBlock]);

  // Mouse drag start
  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const rect = container.getBoundingClientRect();
    const bx = (block.x / 100) * container.scrollWidth;
    const by = block.y;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - rect.left + container.scrollLeft - bx, y: e.clientY - rect.top + container.scrollTop - by });
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
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
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

  // Auto-resize textarea
  const autoResize = (ta: HTMLTextAreaElement) => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };

  return (
    <>
      {blocks.map(block => (
        <div key={block.id}
          className={`floating-block ${editingId === block.id ? "editing" : ""} ${draggingId === block.id ? "dragging" : ""}`}
          style={{ left: `${block.x}%`, top: `${block.y}px`, width: `${block.width}px`, minWidth: 120 }}
          onMouseDown={(e) => handleDragStart(e, block.id)}
          onTouchStart={(e) => handleTouchStart(e, block.id)}
          onDoubleClick={(e) => { e.stopPropagation(); setEditingId(block.id); }}
        >
          {/* Drag handle */}
          <div className="floating-block-handle">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </div>

          {editingId === block.id ? (
            <textarea
              ref={el => { if (el) textareaRefs.current.set(block.id, el); }}
              value={block.content}
              onChange={e => { updateBlock(block.id, e.target.value); autoResize(e.target); }}
              onBlur={() => handleBlur(block.id)}
              onKeyDown={e => handleKeyDown(e, block.id)}
              className="floating-block-textarea"
              placeholder="Write here..."
              spellCheck={false} rows={1}
              onFocus={e => autoResize(e.target)}
            />
          ) : (
            <div className="floating-block-content" onClick={() => setEditingId(block.id)}>
              {block.content.trim()
                ? <div className="floating-block-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown></div>
                : <span className="text-[var(--text-tertiary)] text-sm italic">Empty</span>
              }
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// Create a new block at position
export function createBlock(containerRef: React.RefObject<HTMLDivElement | null>, blocks: FloatingBlock[]): FloatingBlock[] {
  const container = containerRef.current;
  const scrollTop = container?.scrollTop || 0;
  const w = container?.clientWidth || 400;
  const h = container?.clientHeight || 600;
  // Place near center of visible area with slight random offset
  const x = Math.max(5, Math.min(50, ((w * 0.3) / (container?.scrollWidth || w)) * 100 + Math.random() * 20));
  const y = scrollTop + h * 0.3 + Math.random() * 100;
  return [...blocks, { id: genId(), x, y, content: "", width: Math.min(280, w * 0.6) }];
}

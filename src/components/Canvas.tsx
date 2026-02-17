"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CanvasBlock, NOTE_COLORS, NoteColor } from "@/lib/types";
import { generateId } from "@/lib/notes";
import MarkdownPreview from "./MarkdownPreview";

interface Props {
  blocks: CanvasBlock[];
  onChange: (blocks: CanvasBlock[]) => void;
  noteColor: NoteColor;
}

export default function Canvas({ blocks, onChange, noteColor }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingId) {
      const ta = textareaRefs.current.get(editingId);
      if (ta) {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = ta.value.length;
      }
    }
  }, [editingId]);

  // Double-click on empty canvas to create block
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    // Don't create if clicking on a block
    if ((e.target as HTMLElement).closest('.canvas-block')) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newBlock: CanvasBlock = {
      id: generateId(),
      x: Math.max(0, Math.min(85, x)),
      y: Math.max(0, Math.min(90, y)),
      content: "",
      width: 30,
    };

    onChange([...blocks, newBlock]);
    setEditingId(newBlock.id);
  }, [blocks, onChange]);

  // Click on empty area to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.canvas-block')) {
      setEditingId(null);
    }
  }, []);

  // Update block content
  const handleBlockChange = useCallback((id: string, content: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  }, [blocks, onChange]);

  // Delete block if empty on blur
  const handleBlockBlur = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block && !block.content.trim()) {
      onChange(blocks.filter(b => b.id !== id));
    }
    setEditingId(null);
  }, [blocks, onChange]);

  // Delete block with backspace when empty
  const handleBlockKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    const block = blocks.find(b => b.id === id);
    if (e.key === "Backspace" && block && !block.content) {
      e.preventDefault();
      onChange(blocks.filter(b => b.id !== id));
      setEditingId(null);
    }
    if (e.key === "Escape") {
      setEditingId(null);
    }
    // Tab inserts spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newVal = target.value.substring(0, start) + "  " + target.value.substring(end);
      handleBlockChange(id, newVal);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  }, [blocks, onChange, handleBlockChange]);

  // Dragging
  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    // Only drag from the header/grip area, not the textarea
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    const blockX = (block.x / 100) * rect.width;
    const blockY = (block.y / 100) * rect.height;

    setDraggingId(id);
    setDragOffset({
      x: e.clientX - rect.left - blockX,
      y: e.clientY - rect.top - blockY,
    });
  }, [blocks]);

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      onChange(blocks.map(b =>
        b.id === draggingId
          ? { ...b, x: Math.max(0, Math.min(90, x)), y: Math.max(0, Math.min(95, y)) }
          : b
      ));
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, dragOffset, blocks, onChange]);

  // Touch dragging
  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    if (!canvasRef.current) return;

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    const blockX = (block.x / 100) * rect.width;
    const blockY = (block.y / 100) * rect.height;

    setDraggingId(id);
    setDragOffset({
      x: touch.clientX - rect.left - blockX,
      y: touch.clientY - rect.top - blockY,
    });
  }, [blocks]);

  useEffect(() => {
    if (!draggingId) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!canvasRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((touch.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((touch.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      onChange(blocks.map(b =>
        b.id === draggingId
          ? { ...b, x: Math.max(0, Math.min(90, x)), y: Math.max(0, Math.min(95, y)) }
          : b
      ));
    };

    const handleTouchEnd = () => {
      setDraggingId(null);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [draggingId, dragOffset, blocks, onChange]);

  // Auto-resize textarea
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  return (
    <div
      ref={canvasRef}
      className="canvas-container"
      style={{ background: NOTE_COLORS[noteColor].bg }}
      onDoubleClick={handleCanvasDoubleClick}
      onClick={handleCanvasClick}
    >
      {/* Grid pattern */}
      <div className="canvas-grid" />

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-fade-in">
            <p className="zen-quote mb-2">Double-click anywhere to write</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Drag blocks to rearrange
            </p>
          </div>
        </div>
      )}

      {/* Blocks */}
      {blocks.map(block => (
        <div
          key={block.id}
          className={`canvas-block ${editingId === block.id ? 'editing' : ''} ${draggingId === block.id ? 'dragging' : ''}`}
          style={{
            left: `${block.x}%`,
            top: `${block.y}%`,
            width: `${block.width}%`,
            minWidth: '120px',
            maxWidth: '80%',
          }}
          onMouseDown={(e) => handleDragStart(e, block.id)}
          onTouchStart={(e) => handleTouchStart(e, block.id)}
          onDoubleClick={(e) => { e.stopPropagation(); setEditingId(block.id); }}
        >
          {/* Drag handle */}
          <div className="canvas-block-handle">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </div>

          {editingId === block.id ? (
            <textarea
              ref={(el) => { if (el) textareaRefs.current.set(block.id, el); }}
              value={block.content}
              onChange={(e) => {
                handleBlockChange(block.id, e.target.value);
                autoResize(e.target);
              }}
              onBlur={() => handleBlockBlur(block.id)}
              onKeyDown={(e) => handleBlockKeyDown(e, block.id)}
              className="canvas-block-textarea"
              placeholder="Write here..."
              spellCheck={false}
              rows={1}
              onFocus={(e) => autoResize(e.target)}
            />
          ) : (
            <div
              className="canvas-block-content"
              onClick={() => setEditingId(block.id)}
            >
              {block.content.trim() ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <MarkdownPreview content={block.content} />
                </div>
              ) : (
                <span className="text-[var(--text-tertiary)] text-sm italic">
                  Empty block
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

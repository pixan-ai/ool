// Pure grid math — zero side effects, zero React imports

import type { Block } from "./types";

export const GRID_UNIT = 24;
export const BLOCK_DEFAULT_W = 10;
export const BLOCK_DEFAULT_H = 4;

// Padding from canvas edges in grid units
const CANVAS_PADDING_X = 1;
const CANVAS_PADDING_Y = 8; // leave room for title + body area
const SCAN_COLS = 40;
const SCAN_ROWS = 200;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Check if two rectangles overlap (1-unit margin for breathing room) */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  const margin = 1;
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}

/** Scan grid row-by-row to find the first open slot for a new block */
export function findFreePosition(
  blocks: Block[],
  width = BLOCK_DEFAULT_W,
  height = BLOCK_DEFAULT_H
): { x: number; y: number } {
  for (let row = CANVAS_PADDING_Y; row < SCAN_ROWS; row++) {
    for (let col = CANVAS_PADDING_X; col < SCAN_COLS; col++) {
      const candidate: Rect = { x: col, y: row, width, height };
      const collision = blocks.some((b) => rectsOverlap(candidate, b));
      if (!collision) return { x: col, y: row };
    }
  }
  // Fallback: place below everything
  const maxY = blocks.reduce((m, b) => Math.max(m, b.y + b.height), 0);
  return { x: CANVAS_PADDING_X, y: maxY + 1 };
}

/** Snap a pixel coordinate to the nearest grid unit */
export function snapToGrid(px: number): number {
  return Math.round(px / GRID_UNIT);
}

/** Convert grid units to pixels */
export function gridToPx(units: number): number {
  return units * GRID_UNIT;
}

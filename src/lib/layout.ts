import type { Layout, LayoutItem } from '@snapgridjs/core';
import type { Appearance, BookmarkNode, TileSize } from './types';

export const ROWS = 6;
export const GAP = 8;
export const SIZES: Record<TileSize, [number, number]> = {
  small: [1, 1], medium: [2, 2], wide: [4, 2], large: [4, 4],
};
export const usedCols = (layout: Layout) => layout.reduce((max, item) => Math.max(max, item.x + item.w), 0);
export const cellsToPx = (n: number, cell: number, gap = GAP) => Math.max(0, n * cell + (n - 1) * gap);
export const sizeOf = (item: Pick<LayoutItem, 'w' | 'h'>): TileSize =>
  (Object.keys(SIZES) as TileSize[]).find((size) => SIZES[size][0] === item.w && SIZES[size][1] === item.h) ?? 'medium';
export const overlaps = (a: LayoutItem, b: LayoutItem) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function freePosition(layout: Layout, item: LayoutItem): LayoutItem {
  const end = usedCols(layout) + item.w;
  for (let x = 0; x <= end; x++) {
    for (let y = 0; y <= ROWS - item.h; y++) {
      const candidate = { ...item, x, y };
      if (!layout.some((other) => overlaps(candidate, other))) return candidate;
    }
  }
  return { ...item, x: end, y: 0 };
}

/** Preserve valid saved coordinates first. Native sibling order only places new items. */
export function reconcileLayout(
  bookmarks: BookmarkNode[], saved: Layout = [], appearance: Record<string, Appearance> = {},
): Layout {
  const byId = new Map(bookmarks.map((node) => [node.id, node]));
  const occupied: LayoutItem[] = [];
  const seen = new Set<string>();
  for (const item of saved) {
    if (!byId.has(item.i) || seen.has(item.i)) continue;
    const [w, h] = SIZES[appearance[item.i]?.size ?? sizeOf(item)];
    const candidate: LayoutItem = {
      i: item.i, x: Math.max(0, Math.floor(item.x || 0)),
      y: Math.max(0, Math.min(ROWS - h, Math.floor(item.y || 0))), w, h,
    };
    occupied.push(occupied.some((other) => overlaps(candidate, other)) ? freePosition(occupied, candidate) : candidate);
    seen.add(item.i);
  }
  for (const node of bookmarks) {
    if (seen.has(node.id)) continue;
    const [w, h] = SIZES[appearance[node.id]?.size ?? 'medium'];
    occupied.push(freePosition(occupied, { i: node.id, x: 0, y: 0, w, h }));
  }
  return occupied.sort((a, b) => a.x - b.x || a.y - b.y);
}

export function validateLayout(layout: Layout): Layout {
  if (!Array.isArray(layout) || layout.length > 50_000) throw new Error('Invalid tile layout.');
  const seen = new Set<string>();
  return layout.map((item) => {
    if (!item || typeof item.i !== 'string' || seen.has(item.i)) throw new Error('A tile cannot appear twice in a group.');
    if (![item.x, item.y, item.w, item.h].every(Number.isInteger)
      || item.x < 0 || item.x > 1_000_000 || item.y < 0 || item.y + item.h > ROWS
      || !Object.values(SIZES).some(([w, h]) => item.w === w && item.h === h)) {
      throw new Error('Invalid tile coordinates or size.');
    }
    seen.add(item.i);
    return { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h };
  });
}

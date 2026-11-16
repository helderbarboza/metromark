import type { Appearance, BookmarkNode, Layout, LayoutItem, TileSize } from '$lib/types'
import { getT } from '$lib/locale'

export const ROWS = 8
/** Rows in the Dock view, which anchors a short 2-row grid to the bottom. */
export const DOCK_ROWS = 2
export const GAP = 8

export const SIZES: Record<TileSize, [number, number]> = {
  small: [1, 1],
  medium: [2, 2],
  wide: [4, 2],
  large: [4, 4],
}

export const MIN_GROUP_COLS = 2
export const EMPTY_GROUP_COLS = 6
export const ENGINE_COL_HEADROOM = 12
export const MAX_TILE_COLS = 4
export const MIN_ENGINE_COLS = 24

export function usedCols(layout: Layout): number {
  return layout.reduce((max, item) => Math.max(max, item.x + item.w), 0)
}

export function cellsToPx(n: number, cell: number, gap = GAP): number {
  return Math.max(0, n * cell + (n - 1) * gap)
}

export const TILE_SIZES: TileSize[] = ['small', 'medium', 'wide', 'large']

export function tileSizesForRows(rows: number): TileSize[] {
  return TILE_SIZES.filter(size => SIZES[size][1] <= rows)
}

/** Row count for a grid view; anything unknown falls back to the Classic grid. */
export function rowsForGridView(gridView: 'classic' | 'dock' | undefined): number {
  return gridView === 'dock' ? DOCK_ROWS : ROWS
}

/**
 * Size used for layout and rendering. Large tiles cannot fit a grid shorter
 * than 4 rows, so they render as wide in the Dock view. The stored appearance
 * keeps its `large` value; nothing is rewritten.
 */
export function effectiveTileSize(size: TileSize, rows: number = ROWS): TileSize {
  return SIZES[size][1] <= rows ? size : 'wide'
}

export function sizeOf(item: Pick<LayoutItem, 'w' | 'h'>): TileSize {
  return TILE_SIZES.find(size => SIZES[size][0] === item.w && SIZES[size][1] === item.h) ?? 'medium'
}

export function overlaps(a: LayoutItem, b: LayoutItem): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function freePosition(layout: Layout, item: LayoutItem, rows: number = ROWS): LayoutItem {
  const end = usedCols(layout) + item.w
  for (let x = 0; x <= end; x++) {
    for (let y = 0; y <= rows - item.h; y++) {
      const candidate = { ...item, x, y }
      if (!layout.some(other => overlaps(candidate, other)))
        return candidate
    }
  }
  return { ...item, x: end, y: 0 }
}

export function reconcileLayout(
  bookmarks: BookmarkNode[],
  saved: Layout = [],
  appearance: Record<string, Appearance> = {},
  rows: number = ROWS,
): Layout {
  const byId = new Map(bookmarks.map(node => [node.id, node]))
  const occupied: LayoutItem[] = []
  const seen = new Set<string>()
  for (const item of saved) {
    if (!byId.has(item.i) || seen.has(item.i))
      continue
    const [w, h] = SIZES[effectiveTileSize(appearance[item.i]?.size ?? sizeOf(item), rows)]
    const candidate: LayoutItem = {
      i: item.i,
      x: Math.max(0, Math.floor(item.x || 0)),
      y: Math.max(0, Math.min(rows - h, Math.floor(item.y || 0))),
      w,
      h,
    }
    occupied.push(occupied.some(other => overlaps(candidate, other)) ? freePosition(occupied, candidate, rows) : candidate)
    seen.add(item.i)
  }
  for (const node of bookmarks) {
    if (seen.has(node.id))
      continue
    const [w, h] = SIZES[effectiveTileSize(appearance[node.id]?.size ?? 'medium', rows)]
    occupied.push(freePosition(occupied, { i: node.id, x: 0, y: 0, w, h }, rows))
  }
  return occupied.sort((a, b) => a.x - b.x || a.y - b.y)
}

export function validateLayout(layout: unknown, rows: number = ROWS): Layout {
  if (!Array.isArray(layout) || layout.length > 50_000)
    throw new Error(getT().errors.invalidLayout())
  const seen = new Set<string>()
  return layout.map((item: LayoutItem | null) => {
    if (!item || typeof item.i !== 'string' || seen.has(item.i))
      throw new Error(getT().errors.tileAppearsTwice())
    if (![item.x, item.y, item.w, item.h].every(Number.isInteger)
      || item.x < 0 || item.x > 1_000_000 || item.y < 0 || item.y + item.h > rows
      || !Object.values(SIZES).some(([w, h]) => item.w === w && item.h === h)) {
      throw new Error(getT().errors.invalidTileCoordinates())
    }
    seen.add(item.i)
    return { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }
  })
}

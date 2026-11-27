// Pure layout math for the folder tile. No DOM, no Svelte: safe to unit-test in isolation.
//
// Cells are absolutely positioned. Each one gets a rectangle computed here from its
// placement (col/row/span) and the measured container box. Spans are supported in the
// data model; the component currently only emits 1x1 placements.

export interface Placement {
  key: string
  col: number
  row: number
  colSpan: number
  rowSpan: number
}

export interface Box {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface LayoutOptions {
  box: Box
  cols: number
  /** Number of icon rows. The title bar (non-small sizes) sits directly below them. */
  iconRows: number
  /** Gap between cells in px. Matches the previous `gap-px`. */
  gap?: number
}

export const DEFAULT_GAP = 1

export const ZERO_RECT: Rect = { x: 0, y: 0, w: 0, h: 0 }

/** Width of one square cell (1 column). */
export function unitSize(width: number, cols: number, gap: number = DEFAULT_GAP): number {
  if (cols <= 0 || width <= 0)
    return 0
  return Math.max(0, (width - (cols - 1) * gap) / cols)
}

/**
 * Row-major 1x1 placements for keys in index order.
 * Index i goes to col = i % cols, row = floor(i / cols).
 */
export function gridPlacements(keys: string[], cols: number): Placement[] {
  const safeCols = Math.max(1, cols)
  return keys.map((key, index) => ({
    key,
    col: index % safeCols,
    row: Math.floor(index / safeCols),
    colSpan: 1,
    rowSpan: 1,
  }))
}

/**
 * Rectangle for every placement, snapped to whole pixels.
 * Edges are rounded from fractional positions, so neighbours share an edge with a
 * consistent gap and there are no hairline seams.
 */
export function layoutPlacements(placements: Placement[], opts: LayoutOptions): Map<string, Rect> {
  const { box, cols, gap = DEFAULT_GAP } = opts
  const pitch = unitSize(box.width, cols, gap) + gap
  const rects = new Map<string, Rect>()

  for (const p of placements) {
    const left = Math.round(p.col * pitch)
    const top = Math.round(p.row * pitch)
    const right = Math.round((p.col + p.colSpan) * pitch - gap)
    const bottom = Math.round((p.row + p.rowSpan) * pitch - gap)
    rects.set(p.key, {
      x: left,
      y: top,
      w: Math.max(0, right - left),
      h: Math.max(0, bottom - top),
    })
  }

  return rects
}

/** The title bar fills the space below the icon rows. */
export function titleRect(opts: LayoutOptions): Rect {
  const { box, cols, iconRows, gap = DEFAULT_GAP } = opts
  const pitch = unitSize(box.width, cols, gap) + gap
  const y = Math.round(iconRows * pitch)
  return {
    x: 0,
    y,
    w: Math.max(0, Math.round(box.width)),
    h: Math.max(0, Math.round(box.height) - y),
  }
}

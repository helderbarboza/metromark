/**
 * Pure geometry for the wallpaper-cutout canvas.
 *
 * Three coordinate spaces are involved:
 *
 * - content: tile positions as measured inside the board scroller (stable while
 *   scrolling), stored in a flat Float32Array as x/y/w/h CSS pixels;
 * - screen: CSS pixels of the viewport-sized canvas (content minus scroll, plus
 *   the scroller's offset from the canvas);
 * - wallpaper: the pre-scaled offscreen canvas that holds one copy of the
 *   wallpaper for the current zoom and parallax offset.
 *
 * Nothing here touches the DOM, so the math is independently testable. The draw
 * loop performs no per-tile allocations: it reads numbers out of the supplied
 * array and issues one drawImage (plus one tint fillRect) per visible tile.
 */
import type { Settings } from '$lib/config'

import { SETTINGS_DEFAULTS } from '$lib/config'

export const CUTOUT_ZOOM_MIN = 1
export const CUTOUT_ZOOM_MAX = 4
/** Single translucent scrim per tile so labels stay readable on any wallpaper. */
export const CUTOUT_TINT = 'rgba(0, 0, 0, 0.24)'

export function clampCutoutZoom(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value))
    return SETTINGS_DEFAULTS.cutoutZoom ?? 1.5
  return Math.min(CUTOUT_ZOOM_MAX, Math.max(CUTOUT_ZOOM_MIN, value))
}

/** Where the wallpaper sits in screen space, in CSS pixels. */
export interface WallpaperPlacement {
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

export function createPlacement(): WallpaperPlacement {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    zoom: 1,
  }
}

/**
 * Cover the viewport with a zoomed wallpaper and shift it horizontally as the
 * board scrolls. The shift mirrors ImageBackground's CSS parallax so cutouts
 * line up with the page wallpaper at rest. Reduced motion pins it in place.
 * Mutates `out` so the frame loop allocates nothing.
 */
export function positionWallpaper(
  out: WallpaperPlacement,
  viewportW: number,
  viewportH: number,
  zoom: number,
  scrollProgress: number,
  reducedMotion: boolean,
): void {
  const width = viewportW * zoom
  const height = viewportH * zoom
  const shift = reducedMotion
    ? 0
    : (0.5 - scrollProgress) * (zoom - 1) * viewportW
  out.x = (viewportW - width) / 2 + shift
  out.y = (viewportH - height) / 2
  out.width = width
  out.height = height
  out.zoom = zoom
}

/** Source and destination rectangles for object-fit, written into `out`. */
export interface FitRect {
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}

export function createFitRect(): FitRect {
  return {
    sx: 0,
    sy: 0,
    sw: 0,
    sh: 0,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
  }
}

/**
 * Maps a decoded image into a target box using the same fit values the page
 * background uses. `cover` crops, `contain` letterboxes, `fill` stretches.
 * Mutates `out`.
 */
export function fitImageIntoBox(
  naturalW: number,
  naturalH: number,
  targetW: number,
  targetH: number,
  fit: 'cover' | 'contain' | 'fill',
  out: FitRect,
): void {
  out.sx = 0
  out.sy = 0
  out.sw = naturalW
  out.sh = naturalH
  if (fit === 'fill' || naturalW <= 0 || naturalH <= 0 || targetW <= 0 || targetH <= 0) {
    out.dx = 0
    out.dy = 0
    out.dw = targetW
    out.dh = targetH
    return
  }
  const scale = fit === 'cover'
    ? Math.max(targetW / naturalW, targetH / naturalH)
    : Math.min(targetW / naturalW, targetH / naturalH)
  out.dw = naturalW * scale
  out.dh = naturalH * scale
  out.dx = (targetW - out.dw) / 2
  out.dy = (targetH - out.dh) / 2
}

/** The subset of a 2D context the cutout pass needs. */
export interface CutoutContext {
  fillStyle: string | CanvasGradient | CanvasPattern
  clearRect: (x: number, y: number, w: number, h: number) => void
  fillRect: (x: number, y: number, w: number, h: number) => void
  drawImage: (
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void
}

export interface CutoutDrawOptions {
  /** Pre-scaled wallpaper, sized in device pixels. */
  source: CanvasImageSource
  placement: WallpaperPlacement
  scrollX: number
  scrollY: number
  /** Scroller viewport offset from the canvas origin, in CSS pixels. */
  originX: number
  originY: number
  viewportW: number
  viewportH: number
  dpr: number
}

/**
 * Clears the canvas and redraws the wallpaper slice behind each visible tile.
 * `rects` is a flat [x, y, w, h, …] array in content space; `count` is the
 * number of populated entries. Returns how many tiles were drawn.
 */
export function drawCutouts(
  ctx: CutoutContext,
  rects: Float32Array,
  count: number,
  o: CutoutDrawOptions,
): number {
  ctx.clearRect(0, 0, o.viewportW, o.viewportH)
  ctx.fillStyle = CUTOUT_TINT
  const p = o.placement
  let drawn = 0
  for (let i = 0; i < count; i++) {
    const base = i * 4
    const x = rects[base] - o.scrollX + o.originX
    const y = rects[base + 1] - o.scrollY + o.originY
    const w = rects[base + 2]
    const h = rects[base + 3]
    // Cull: skip tiles fully outside the viewport.
    if (x + w <= 0 || y + h <= 0 || x >= o.viewportW || y >= o.viewportH)
      continue
    // Clip: only sample wallpaper pixels that land on screen.
    const cx = Math.max(0, x)
    const cy = Math.max(0, y)
    const cw = Math.min(o.viewportW, x + w) - cx
    const ch = Math.min(o.viewportH, y + h) - cy
    if (cw <= 0 || ch <= 0)
      continue
    ctx.drawImage(
      o.source,
      (cx - p.x) * o.dpr,
      (cy - p.y) * o.dpr,
      cw * o.dpr,
      ch * o.dpr,
      cx,
      cy,
      cw,
      ch,
    )
    ctx.fillRect(cx, cy, cw, ch)
    drawn++
  }
  return drawn
}

/** Default color used when the active background cannot feed the canvas. */
export function cutoutFallbackColor(background: Settings['background']): string | undefined {
  return background.auto === false
    ? background.color
    : undefined
}

export type IconShape = 0 | 1 | 2 | -1

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Alpha below this counts as transparent for range detection. */
export const ALPHA_CUTOFF = 64
export const FILLED_GLYPH_SCALE = 0.55
export const LUM_CUTOUT_PERCENTILE = 0.7

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Anything `processIconImage` can load: file/blob, URL, or drawable. */
export type IconImageSource
  = | Blob
    | string
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap

type IconOutputKind = 'canvas' | 'dataURL' | 'blob'

export interface ProcessIconOptions {
  /** 0xAARRGGBB tint color. */
  tintArgb: number
  /** 0xAARRGGBB background color (needed if filled=true). */
  bgArgb?: number
  /** -1 = no clip, 2 = square/no clip, 0 = circle, 1 = rounded rect. */
  iconShapeId?: IconShape
  /** Silhouette (false) vs filled tile (true). */
  filled?: boolean
  clipGlyphToShape?: boolean
  /**
   * Transparency handling for near-transparent source pixels (alpha < 64).
   * false (default): force them to opaque tint (flat tile look).
   * true: keep them transparent so the glyph crops to its real shape.
   */
  preserveTransparency?: boolean
  output?: IconOutputKind
}

type DrawableImage
  = | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap

/**
 * Main entry point for frontend use.
 *
 * - File/Blob from `<input type="file">`
 * - string (URL or data URL)
 * - an already-loaded `<img>`, `<canvas>`, or ImageBitmap
 */
export async function processIconImage(
  imageSource: IconImageSource,
  options: ProcessIconOptions & { output?: 'canvas' },
): Promise<HTMLCanvasElement>
export async function processIconImage(
  imageSource: IconImageSource,
  options: ProcessIconOptions & { output: 'dataURL' },
): Promise<string>
export async function processIconImage(
  imageSource: IconImageSource,
  options: ProcessIconOptions & { output: 'blob' },
): Promise<Blob | null>
export async function processIconImage(
  imageSource: IconImageSource,
  options: ProcessIconOptions,
): Promise<HTMLCanvasElement | string | Blob | null> {
  const {
    tintArgb,
    bgArgb = 0xFF000000,
    iconShapeId = -1,
    filled = false,
    clipGlyphToShape = false,
    preserveTransparency = false,
    output = 'canvas',
  } = options

  // 1. Normalize input into a drawable element
  const drawable = await loadDrawable(imageSource)

  // 2. Get intrinsic dimensions of the source
  const { width, height } = getDrawableSize(drawable)

  // 3. Draw into a canvas at intrinsic size (1:1)
  const srcCanvas = createCanvas(width, height)
  get2dContext(srcCanvas).drawImage(drawable, 0, 0, width, height)

  // 4. Run the pipeline
  const resultCanvas = renderType3LuminanceSilhouette(
    srcCanvas,
    tintArgb,
    bgArgb,
    iconShapeId,
    filled,
    clipGlyphToShape,
    preserveTransparency,
  )

  // 5. Return in whatever shape the caller needs
  switch (output) {
    case 'dataURL':
      return resultCanvas.toDataURL('image/png')
    case 'blob':
      return new Promise<Blob | null>(resolve =>
        resultCanvas.toBlob(resolve, 'image/png'),
      )
    case 'canvas':
    default:
      return resultCanvas
  }
}

/** Normalizes any supported input into a drawable (Image/Canvas/ImageBitmap). */
async function loadDrawable(src: IconImageSource): Promise<DrawableImage> {
  if (src instanceof HTMLCanvasElement || src instanceof ImageBitmap) {
    return Promise.resolve(src)
  }
  if (src instanceof HTMLImageElement) {
    if (src.complete)
      return Promise.resolve(src)
    return new Promise<DrawableImage>((resolve, reject) => {
      src.onload = () => resolve(src)
      src.onerror = () =>
        reject(new Error('Failed to load HTMLImageElement'))
    })
  }
  // File / Blob / URL string
  const isBlob = src instanceof Blob
  const url: string = isBlob
    ? URL.createObjectURL(src)
    : src
  return new Promise<DrawableImage>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // needed if loading from remote URLs (CORS)
    img.onload = () => {
      if (isBlob)
        URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

// ---------------------------------------------------------------------------
// Canvas helpers (Bitmap equivalents)
// ---------------------------------------------------------------------------
function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx)
    throw new Error('2d canvas context is not available')
  return ctx
}

// ---------------------------------------------------------------------------
// Canvas size helpers
// ---------------------------------------------------------------------------
function getDrawableSize(drawable: DrawableImage): { width: number, height: number } {
  if (drawable instanceof HTMLImageElement) {
    const w = drawable.naturalWidth || drawable.width
    const h = drawable.naturalHeight || drawable.height
    if (w <= 0 || h <= 0)
      throw new Error('Image has 0 px dimensions (naturalWidth/naturalHeight).')
    return { width: w, height: h }
  }
  if (drawable instanceof HTMLCanvasElement || drawable instanceof ImageBitmap) {
    if (drawable.width <= 0 || drawable.height <= 0)
      throw new Error('Canvas/ImageBitmap has 0 px dimensions.')
    return { width: drawable.width, height: drawable.height }
  }
  throw new Error('Unsupported drawable type for size extraction.')
}

// ---------------------------------------------------------------------------
// renderType3LuminanceSilhouette — internal entry point for the type-3 pipeline
// ---------------------------------------------------------------------------
function renderType3LuminanceSilhouette(
  src: HTMLCanvasElement,
  tintArgb: number,
  bgArgb: number,
  iconShapeId: IconShape,
  filled: boolean,
  clipGlyphToShape = false,
  preserveTransparency = false,
): HTMLCanvasElement {
  if (filled) {
    const rawSil = renderLuminanceSilhouette(src, tintArgb, preserveTransparency)
    const sil = clipGlyphToShape
      ? clipCanvasToIconShape(rawSil, iconShapeId)
      : rawSil
    return invertToFilledTile(sil, tintArgb, bgArgb, iconShapeId)
  }
  else {
    const sil = renderLuminanceSilhouette(src, tintArgb, preserveTransparency)
    return clipCanvasToIconShape(sil, iconShapeId)
  }
}

// ---------------------------------------------------------------------------
// renderLuminanceSilhouette
//   Turns an arbitrary icon image into a flat 2-tone silhouette based
//   on a luminance threshold computed from the icon's own min/max luminance.
//   Reads from the source canvas but only writes to a new canvas, so the
//   input is never mutated. Output preserves the source dimensions.
// ---------------------------------------------------------------------------
function renderLuminanceSilhouette(
  srcCanvas: HTMLCanvasElement,
  tintArgb: number,
  preserveTransparency = false,
): HTMLCanvasElement {
  const width = srcCanvas.width
  const height = srcCanvas.height

  const ctx = get2dContext(srcCanvas)
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data // RGBA bytes

  // Pass 1: find luminance range among "opaque enough" pixels.
  let minLum = 1
  let maxLum = 0
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a > ALPHA_CUTOFF) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      if (lum < minLum)
        minLum = lum
      if (lum > maxLum)
        maxLum = lum
    }
  }

  const cutoutThreshold = minLum + (maxLum - minLum) * LUM_CUTOUT_PERCENTILE
  const tR = redOf(tintArgb)
  const tG = greenOf(tintArgb)
  const tB = blueOf(tintArgb)

  // Pass 2: binarize into tint-colored vs. transparent cutout.
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < ALPHA_CUTOFF) {
      if (preserveTransparency) {
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
        data[i + 3] = 0
      }
      else {
        data[i] = tR
        data[i + 1] = tG
        data[i + 2] = tB
        data[i + 3] = 255
      }
      continue
    }
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    if (lum > cutoutThreshold) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
    }
    else {
      data[i] = tR
      data[i + 1] = tG
      data[i + 2] = tB
      data[i + 3] = 255
    }
  }

  const out = createCanvas(width, height)
  get2dContext(out).putImageData(imgData, 0, 0)
  return out
}

function clipCanvasToIconShape(
  canvas: HTMLCanvasElement,
  iconShapeId: IconShape,
): HTMLCanvasElement {
  // -1 and 2 mean "no clip".
  if (iconShapeId === -1 || iconShapeId === 2)
    return canvas
  const width = canvas.width
  const height = canvas.height
  const out = createCanvas(width, height)
  const ctx = get2dContext(out)
  ctx.save()
  tracePathForShape(ctx, iconShapeId, width, height)
  ctx.clip()
  ctx.drawImage(canvas, 0, 0)
  ctx.restore()
  return out
}

// ---------------------------------------------------------------------------
// invertToFilledTile
//   Fills the whole tile with the tint color, then stamps the (inverted,
//   bg-colored) glyph silhouette into the center, finally clips to shape.
//   Output preserves the source dimensions.
// ---------------------------------------------------------------------------
function invertToFilledTile(
  silhouetteCanvas: HTMLCanvasElement,
  tintArgb: number,
  bgArgb: number,
  iconShapeId: IconShape,
): HTMLCanvasElement {
  const width = silhouetteCanvas.width
  const height = silhouetteCanvas.height

  // Scale glyph proportionally to fit within glyphSize box based on shorter side
  const glyphSize = Math.max(1, Math.floor(Math.min(width, height) * FILLED_GLYPH_SCALE))
  const scale = glyphSize / Math.max(width, height)
  const glyphWidth = Math.max(1, Math.round(width * scale))
  const glyphHeight = Math.max(1, Math.round(height * scale))

  const glyph = scaleCanvas(silhouetteCanvas, glyphWidth, glyphHeight)

  const tile = createCanvas(width, height)
  const ctx = get2dContext(tile)

  // drawColor(tintArgb)
  ctx.fillStyle = colorToCss(tintArgb)
  ctx.fillRect(0, 0, width, height)

  const left = (width - glyphWidth) / 2
  const top = (height - glyphHeight) / 2

  // PorterDuffColorFilter(bgArgb, SRC_IN) applied to the glyph before compositing
  const recoloredGlyph = applyColorSrcIn(glyph, bgArgb)
  ctx.drawImage(recoloredGlyph, left, top)

  return clipCanvasToIconShape(tile, iconShapeId)
}

function scaleCanvas(
  src: HTMLCanvasElement,
  w: number,
  h: number,
): HTMLCanvasElement {
  const out = createCanvas(w, h)
  const ctx = get2dContext(out)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, w, h)
  return out
}

// ---------------------------------------------------------------------------
// Color helpers (Android packs colors as 0xAARRGGBB ints)
// ---------------------------------------------------------------------------

export function alphaOf(argb: number): number {
  return (argb >>> 24) & 0xFF
}
export function redOf(argb: number): number {
  return (argb >>> 16) & 0xFF
}
export function greenOf(argb: number): number {
  return (argb >>> 8) & 0xFF
}
export function blueOf(argb: number): number {
  return argb & 0xFF
}

/**
 * Parse a `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` CSS hex color into a
 * 0xAARRGGBB int. DOM-free so unit tests can cover the caller migration
 * from CSS strings to ARGB ints without canvas.
 */
export function cssColorToArgb(css: string): number {
  const hex = css.trim().replace(/^#/, '')
  const expand = (h: string) =>
    h
      .split('')
      .map(c => c + c)
      .join('')
  let r: string
  let g: string
  let b: string
  let a = 'ff'
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    [r, g, b] = [hex[0] + hex[0], hex[1] + hex[1], hex[2] + hex[2]]
  }
  else if (/^[0-9a-f]{4}$/i.test(hex)) {
    const e = expand(hex);
    [r, g, b, a] = [
      e.slice(0, 2),
      e.slice(2, 4),
      e.slice(4, 6),
      e.slice(6, 8),
    ]
  }
  else if (/^[0-9a-f]{6}$/i.test(hex)) {
    [r, g, b] = [
      hex.slice(0, 2),
      hex.slice(2, 4),
      hex.slice(4, 6),
    ]
  }
  else if (/^[0-9a-f]{8}$/i.test(hex)) {
    [r, g, b, a] = [
      hex.slice(0, 2),
      hex.slice(2, 4),
      hex.slice(4, 6),
      hex.slice(6, 8),
    ]
  }
  else {
    throw new Error(`Unsupported CSS color "${css}". Use #rgb, #rrggbb, or #rrggbbaa.`)
  }
  return (
    (((Number.parseInt(a, 16) << 24) >>> 0)
      | (Number.parseInt(r, 16) << 16)
      | (Number.parseInt(g, 16) << 8)
      | Number.parseInt(b, 16))
    >>> 0
  )
}

// ---------------------------------------------------------------------------
// Shape clipping keyed by `iconShapeId`: 0 = circle, 1 = squircle-ish
// rounded rect, 2 = square (no-op via the early return in
// `clipCanvasToIconShape`), -1 = no clip.
// ---------------------------------------------------------------------------
function tracePathForShape(
  ctx: CanvasRenderingContext2D,
  shapeId: 0 | 1,
  width: number,
  height: number,
): void {
  ctx.beginPath()
  switch (shapeId) {
    case 0: { // circle
      const radius = Math.min(width, height) / 2
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
      break
    }
    case 1: {
      // squircle-ish (rounded rect approximation)
      const r = Math.min(width, height) * 0.3
      roundedRectPath(ctx, 0, 0, width, height, r)
      break
    }
  }
  ctx.closePath()
}

export function colorToCss(argbInt: number): string {
  return `rgba(${redOf(argbInt)},${greenOf(argbInt)},${blueOf(argbInt)},${alphaOf(argbInt) / 255})`
}

// ---------------------------------------------------------------------------
// applyColorSrcIn — emulates Android PorterDuff.Mode.SRC_IN
//   Replaces every non-transparent pixel's RGB with `colorArgb`'s RGB,
//   scaling the result alpha by both the mask color's alpha and the
//   source pixel's own alpha (matches SRC_IN semantics).
// ---------------------------------------------------------------------------
function applyColorSrcIn(
  canvas: HTMLCanvasElement,
  colorArgb: number,
): HTMLCanvasElement {
  const w = canvas.width
  const h = canvas.height
  const ctx = get2dContext(canvas)
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  const r = redOf(colorArgb)
  const g = greenOf(colorArgb)
  const b = blueOf(colorArgb)
  const a = alphaOf(colorArgb)

  for (let i = 0; i < data.length; i += 4) {
    const srcAlpha = data[i + 3]
    if (srcAlpha === 0)
      continue
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = Math.round((a / 255) * srcAlpha)
  }

  const out = createCanvas(w, h)
  get2dContext(out).putImageData(imgData, 0, 0)
  return out
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
}

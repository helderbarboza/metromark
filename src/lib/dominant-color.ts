// Dominant-color extraction and theme-swatch matching for tile accents.
// Pure module (no DOM) so unit tests can cover the color rules without canvas.

export type Rgb = [number, number, number]

/** Pixels at or below this alpha are treated as transparent. */
const ALPHA_CUTOFF = 128
/** Ignore near-black pixels; they have no usable accent. */
const MIN_LIGHTNESS = 0.08
/** Ignore near-white pixels, which are usually icon backgrounds. */
const MAX_LIGHTNESS = 0.96
/** Ignore grayscale and nearly grayscale pixels (black/white favicons). */
const MIN_CHROMA = 0.04
/** 4 bits per channel keeps equal colors in the same bucket. */
const BUCKET_MASK = 0xF0

interface Bucket {
  count: number
  red: number
  green: number
  blue: number
}

/**
 * Find the most common chromatic color in RGBA pixel data.
 * Returns null when the icon has no usable accent color, such as a
 * black-and-white logo or a fully transparent image.
 */
export function extractDominantColor(pixels: ArrayLike<number>): Rgb | null {
  const buckets = new Map<number, Bucket>()

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < ALPHA_CUTOFF)
      continue
    const red = pixels[i]
    const green = pixels[i + 1]
    const blue = pixels[i + 2]
    const [lightness, a, b] = rgbToOklab([red, green, blue])
    const chroma = Math.hypot(a, b)
    if (chroma < MIN_CHROMA || lightness < MIN_LIGHTNESS || lightness > MAX_LIGHTNESS)
      continue

    const key
      = ((red & BUCKET_MASK) << 16)
        | ((green & BUCKET_MASK) << 8)
        | (blue & BUCKET_MASK)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count++
      bucket.red += red
      bucket.green += green
      bucket.blue += blue
    }
    else {
      buckets.set(key, { count: 1, red, green, blue })
    }
  }

  let best: Bucket | undefined
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count)
      best = bucket
  }
  if (!best)
    return null

  return [
    Math.round(best.red / best.count),
    Math.round(best.green / best.count),
    Math.round(best.blue / best.count),
  ]
}

/**
 * Return the index of the perceptually nearest swatch, or undefined when
 * the palette has no valid color. Comparisons use OKLab, so hues win over
 * raw RGB distance.
 */
export function nearestSwatchIndex(rgb: Rgb, swatches: string[]): number | undefined {
  const target = rgbToOklab(rgb)
  let bestIndex: number | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  swatches.forEach((swatch, index) => {
    const parsed = parseHexColor(swatch)
    if (!parsed)
      return
    const distance = oklabDistance(target, rgbToOklab(parsed))
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  return bestIndex
}

/** Convert an sRGB color (0-255 channels) to OKLab: [lightness, a, b]. */
export function rgbToOklab([red, green, blue]: Rgb): Rgb {
  const r = srgbToLinear(red)
  const g = srgbToLinear(green)
  const b = srgbToLinear(blue)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function srgbToLinear(channel: number): number {
  const value = channel / 255
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
}

function oklabDistance(a: Rgb, b: Rgb): number {
  const lightness = a[0] - b[0]
  const greenRed = a[1] - b[1]
  const blueYellow = a[2] - b[2]
  return lightness * lightness + greenRed * greenRed + blueYellow * blueYellow
}

function parseHexColor(value: string): Rgb | undefined {
  const hex = value.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(hex))
    return undefined
  const expanded = hex.length === 3
    ? hex.split('').map(character => character + character).join('')
    : hex
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

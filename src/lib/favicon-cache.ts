// Loading + Metro conversion for tile favicons, with an in-memory cache.
// Plain module (not a Svelte component) so the cache stays non-reactive.
// Converted silhouettes are never persisted: the browser favicon cache is
// local and reconversion on reload is cheap.

import type { Rgb } from './dominant-color'
import { extractDominantColor, nearestSwatchIndex } from './dominant-color'
import { cssColorToArgb, processIconImage } from './icon-convert'
import { buildExtensionFaviconUrl, isFaviconEligible } from './icon-sources'

const convertedCache = new Map<string, string>()
const pendingCache = new Map<string, Promise<string>>()

const faviconCache = new Map<string, string>()
const faviconPendingCache = new Map<string, Promise<string>>()

const dominantCache = new Map<string, Rgb>()

/** The longest time to wait for a local favicon before keeping the hashed accent. */
const DOMINANT_TIMEOUT = 5000

/** Load a page's cached favicon and convert it to a Metro-tint silhouette. */
export async function loadConvertedFavicon(
  pageUrl: string,
  tint: string,
): Promise<string> {
  const key = `${pageUrl}|${tint}`
  const hit = convertedCache.get(key)

  if (hit != null)
    return Promise.resolve(hit)

  const pending = pendingCache.get(key)

  if (pending)
    return pending

  const task = (async () => {
    const source = buildExtensionFaviconUrl(pageUrl, 64, undefined, 2)
    // Null when the URL is not http(s) or the extension runtime helper is
    // unavailable (web preview). Callers render the bundled fallback.
    if (source == null)
      throw new Error('No cached favicon available.')
    const img = await loadImage(source)
    // Convert at the bitmap's native decoded resolution. No cap, no resize.
    const dataUrl = await processIconImage(img, {
      tintArgb: cssColorToArgb(tint),
      filled: false,
      iconShapeId: -1,
      preserveTransparency: true,
      output: 'dataURL',
    })
    convertedCache.set(key, dataUrl)

    return dataUrl
  })()
  pendingCache.set(key, task)
  task.catch(() => {}).finally(() => {
    pendingCache.delete(key)
  })
  return task
}

/** Load a page's cached favicon as a regular data URL (no Metro conversion). */
export async function loadFavicon(
  pageUrl: string,
): Promise<string> {
  const key = pageUrl
  const hit = faviconCache.get(key)

  if (hit != null)
    return Promise.resolve(hit)

  const pending = faviconPendingCache.get(key)

  if (pending)
    return pending

  const task = (async () => {
    const source = buildExtensionFaviconUrl(pageUrl, 64, undefined, 2)
    if (source == null)
      throw new Error('No cached favicon available.')
    const img = await loadImage(source)
    // Draw 1:1 at intrinsic dimensions, no resize
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth > 0 ? img.naturalWidth : 64
    canvas.height = img.naturalHeight > 0 ? img.naturalHeight : 64
    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error('2d canvas context is not available')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    faviconCache.set(key, dataUrl)
    return dataUrl
  })()
  faviconPendingCache.set(key, task)
  task.catch(() => {}).finally(() => {
    faviconPendingCache.delete(key)
  })
  return task
}

/**
 * Pick the theme swatch nearest to the favicon's dominant color.
 * Returns undefined when the favicon is unavailable, has no usable color,
 * or the palette is empty. Never throws; callers keep the hashed accent.
 */
export async function suggestAccentIndex(
  pageUrl: string,
  swatches: string[],
): Promise<number | undefined> {
  const dominant = await loadDominantFaviconColor(pageUrl)
  if (dominant == null)
    return undefined
  return nearestSwatchIndex(dominant, swatches)
}

/** Read and sample a page's cached favicon, caching only successful colors. */
async function loadDominantFaviconColor(pageUrl: string): Promise<Rgb | null> {
  const key = pageUrl.trim()
  const hit = dominantCache.get(key)
  if (hit != null)
    return hit
  if (!isFaviconEligible(key))
    return null

  const source = buildExtensionFaviconUrl(key, 64, undefined, 2)
  if (source == null)
    return null

  try {
    const img = await loadImageBefore(source, DOMINANT_TIMEOUT)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth > 0 ? img.naturalWidth : 64
    canvas.height = img.naturalHeight > 0 ? img.naturalHeight : 64
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return null
    ctx.drawImage(img, 0, 0)
    const dominant = extractDominantColor(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
    if (dominant)
      dominantCache.set(key, dominant)
    return dominant
  }
  catch {
    // Retry once after a short delay for transient load failures.
    await new Promise(resolve => setTimeout(resolve, 250))
    try {
      const img = await loadImageBefore(source, DOMINANT_TIMEOUT)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth > 0 ? img.naturalWidth : 64
      canvas.height = img.naturalHeight > 0 ? img.naturalHeight : 64
      const ctx = canvas.getContext('2d')
      if (!ctx)
        return null
      ctx.drawImage(img, 0, 0)
      const dominant = extractDominantColor(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
      if (dominant)
        dominantCache.set(key, dominant)
      return dominant
    }
    catch {
      return null
    }
  }
}

async function loadImageBefore(source: string, timeout: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('The favicon took too long to load.')),
      timeout,
    )
    loadImage(source).then(
      (image) => {
        clearTimeout(timer)
        resolve(image)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Same-origin extension cache URL: no CORS attributes, canvas stays clean.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The favicon could not be loaded.'))
    img.src = source
  })
}

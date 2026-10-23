// Loading + Metro conversion for tile favicons, with an in-memory cache.
// Plain module (not a Svelte component) so the cache stays non-reactive.
// Converted silhouettes are never persisted: the browser favicon cache is
// local and reconversion on reload is cheap.

import { cssColorToArgb, processIconImage } from './icon-convert'
import { buildExtensionFaviconUrl } from './icon-sources'

const convertedCache = new Map<string, string>()
const pendingCache = new Map<string, Promise<string>>()

const faviconCache = new Map<string, string>()
const faviconPendingCache = new Map<string, Promise<string>>()

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

async function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Same-origin extension cache URL: no CORS attributes, canvas stays clean.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The favicon could not be loaded.'))
    img.src = source
  })
}

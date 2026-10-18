// Loading + Metro conversion for tile favicons, with an in-memory cache.
// Plain module (not a Svelte component) so the cache stays non-reactive.
// Converted silhouettes are never persisted: the browser favicon cache is
// local and reconversion on reload is cheap.

import { cssColorToArgb, processIconImage } from './icon-convert'
import { buildExtensionFaviconUrl } from './icon-sources'

/** Upper bound for conversion canvases; the cache serves 64 DIP at most. */
const MAX_CONVERT_SIZE = 128

const convertedCache = new Map<string, string>()
const pendingCache = new Map<string, Promise<string>>()

/** Load a page's cached favicon and convert it to a Metro-tint silhouette. */
export async function loadConvertedFavicon(
  pageUrl: string,
  tint: string,
  requestSize: number,
  convertSize: number,
  scaleFactor: 1 | 2 = 1,
): Promise<string> {
  const key = `${pageUrl}|${tint}|${requestSize}|${scaleFactor}`
  const hit = convertedCache.get(key)
  if (hit != null)
    return Promise.resolve(hit)
  const pending = pendingCache.get(key)
  if (pending)
    return pending
  const task = (async () => {
    const source = buildExtensionFaviconUrl(pageUrl, requestSize, undefined, scaleFactor)
    // Null when the URL is not http(s) or the extension runtime helper is
    // unavailable (web preview). Callers render the bundled fallback.
    if (source == null)
      throw new Error('No cached favicon available.')
    const img = await loadImage(source)
    // Convert at the bitmap's native decoded resolution (capped): when the
    // browser honors scale_factor=2x this is 128px and genuinely sharper;
    // when it ignores the probe it is the requested size. Converting above
    // native resolution would only smear the upscale, so never do that.
    // `convertSize` remains as the fallback when the width is unreadable.
    const native = img.naturalWidth > 0 ? img.naturalWidth : convertSize
    const target = Math.max(16, Math.min(MAX_CONVERT_SIZE, native))
    const dataUrl = await processIconImage(img, {
      sizePx: target,
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

async function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Same-origin extension cache URL: no CORS attributes, canvas stays clean.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The favicon could not be loaded.'))
    img.src = source
  })
}

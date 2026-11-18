import type { Settings } from '$lib/config'
import { BACKGROUND_DEFAULTS } from '$lib/config'
import { getT } from '$lib/locale'

// Validation and sizing math for image backgrounds. This module stays DOM-free
// so it can be unit tested in node; canvas encoding happens in the settings UI.

/** Upload size cap. Backed by IndexedDB, so this is a sanity bound, not a quota squeeze. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
/** Stored size cap for a legacy inline data URI, in characters (~2.6 MB decoded). Only for pre-existing inline uploads; new uploads use IndexedDB. */
export const MAX_STORED_CHARACTERS = 3_500_000
/** Longest edge an uploaded image keeps; larger images are downscaled before storing. */
const MAX_DIMENSION = 2560

/** IndexedDB media reference produced by the upload flow: `idb:<uuid>`. */
const MEDIA_KEY = /^idb:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_UPLOAD_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

/** Base64 raster image data the background layer can display. */
const DATA_IMAGE_URI = /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml|avif);base64,[A-Z0-9+/=\r\n]+$/i

export function isDataImageUri(value: string): boolean {
  return DATA_IMAGE_URI.test(value)
}

/** True for `idb:<uuid>` references into the IndexedDB background-media store. */
export function isMediaKey(value: string): boolean {
  return MEDIA_KEY.test(value)
}

function isHttpImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }
  catch {
    return false
  }
}

/** Size checks for a file picked by the user. Throws with a message meant for the UI. */
export function validateUploadFile(file: { type: string, size: number }): void {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new Error(
      getT().backgroundErrors.unsupportedUploadType({ type: file.type || 'unknown' }),
    )
  }
  if (!(file.size > 0))
    throw new Error(getT().backgroundErrors.fileEmpty())
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error(getT().backgroundErrors.fileTooLarge())
}

/**
 * A background URL is either empty (not set), a remote http(s) address, an
 * `idb:<uuid>` reference into the IndexedDB media store (uploads above the
 * legacy cap, and all new uploads), or a legacy base64 data:image URI.
 * Anything else — including `javascript:`, `file:` and non-image `data:` URIs — is rejected.
 */
export function validateBackgroundUrl(value: string): string {
  const url = value.trim()
  if (url === '')
    return ''
  if (isMediaKey(url))
    return url
  if (url.length > MAX_STORED_CHARACTERS)
    throw new Error(getT().backgroundErrors.tooLargeInline())
  if (/^data:/i.test(url)) {
    if (!isDataImageUri(url))
      throw new Error(getT().backgroundErrors.unsupportedImageData())
    return url
  }
  if (/^idb:/i.test(url))
    throw new Error(getT().backgroundErrors.badStoredReference())
  if (isHttpImageUrl(url))
    return url
  try {
    const parsed = new URL(url)
    throw new Error(getT().backgroundErrors.backgroundHttpOnly({
      scheme: parsed.protocol.slice(0, -1),
    }))
  }
  catch (error) {
    if (error instanceof TypeError)
      throw new Error(getT().urlErrors.invalid())
    throw error
  }
}

export interface ClampedDimensions {
  width: number
  height: number
  /** True when the image was larger than `maxEdge` on its longest side. */
  scaled: boolean
}

/**
 * One-time migration: `parallaxZoom` used to be stored as whole percentages
 * (150 means 1.5×). Rescale those to factors and clamp everything to the
 * supported 1…4 range. Values inside the range are left untouched.
 */
export function normalizeImageBackgroundSettings(settings: Settings): Settings {
  const background = settings.background
  if (background.type !== 'image' || background.parallaxZoom === undefined)
    return settings
  const zoom = background.parallaxZoom
  if (!Number.isFinite(zoom)) {
    return {
      ...settings,
      background: { ...background, parallaxZoom: BACKGROUND_DEFAULTS.image.parallaxZoom },
    }
  }
  const factor = zoom > 4
    ? zoom / 100
    : zoom
  const clamped = Math.min(4, Math.max(1, factor))
  if (clamped === zoom)
    return settings
  return {
    ...settings,
    background: { ...background, parallaxZoom: clamped },
  }
}

/** Scale (width, height) down so the longest edge is at most `maxEdge`. Degenerate input clamps to 1x1. */
export function clampDimensions(width: number, height: number, maxEdge: number = MAX_DIMENSION): ClampedDimensions {
  const w = Number.isFinite(width)
    ? Math.max(1, Math.floor(width))
    : 1
  const h = Number.isFinite(height)
    ? Math.max(1, Math.floor(height))
    : 1
  const longest = Math.max(w, h)
  if (longest <= maxEdge)
    return { width: w, height: h, scaled: false }
  const ratio = maxEdge / longest
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
    scaled: true,
  }
}

/** Rough decoded size of a base64 data URI, in bytes. Returns 0 for anything that is not base64. */
export function estimateDataUriBytes(uri: string): number {
  const match = /^data:[^;,]*(?:;charset=[^;,]+)?;base64,(.*)$/is.exec(uri)
  if (!match)
    return 0
  const payload = match[1].replace(/\s/g, '')
  const padding = payload.endsWith('==')
    ? 2
    : payload.endsWith('=')
      ? 1
      : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

// Helpers for the icon-conversion POC. Three icon input sources feed the same
// converter: the browser's local favicon cache, a user-uploaded image file, or
// a custom remote icon URL. Everything here is DOM-free so it stays unit
// testable; canvas pixel access happens in the component.

import type { TileSize } from './types'

declare global {
  interface Window {
    chrome?: { runtime?: { getURL?: (path: string) => string } }
    browser?: { runtime?: { getURL?: (path: string) => string } }
  }
}

export type ConvertFailureKind = 'cors-taint' | 'load-failure' | 'unsupported-type' | 'unknown'

/** Classify a converter failure so the UI can explain it instead of swallowing it. */
export function classifyConvertError(error: unknown): ConvertFailureKind {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : String(error)
  if (name === 'SecurityError' || /taint|origin-clean|cross-origin/i.test(message))
    return 'cors-taint'
  if (/unsupported image type/i.test(message))
    return 'unsupported-type'
  if (/load|network|fetch|decod|empty|naturalwidth|0 px/i.test(message))
    return 'load-failure'
  return 'unknown'
}

/** User-facing explanation per failure kind. The raw error is shown alongside. */
export function failureHint(kind: ConvertFailureKind): string {
  switch (kind) {
    case 'cors-taint':
      return 'Pixel access blocked: that server does not send CORS headers, so the canvas is tainted and conversion is impossible. Upload the file instead.'
    case 'load-failure':
      return 'The image could not be loaded. Check the address, or on Firefox note that chrome://favicon is unavailable.'
    case 'unsupported-type':
      return 'That image type cannot be drawn to a canvas here.'
    case 'unknown':
      return 'Conversion failed unexpectedly.'
  }
}

// Chromium serves favicon requests at 16, 32 or 64 DIP at most
// (IconSize { SIZE_16, SIZE_32, SIZE_64 }); larger requests are served 64px.
const MAX_FAVICON_SIZE = 64

/** True for http(s) page addresses that can have a cached favicon. */
export function isFaviconEligible(pageUrl: string): boolean {
  try {
    const parsed = new URL(pageUrl.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }
  catch {
    return false
  }
}

/** Clamp a requested favicon size to the browser-supported range. */
export function clampFaviconSize(size: number): number {
  return Math.max(16, Math.min(MAX_FAVICON_SIZE, Math.floor(size) || 64))
}

/**
 * Always request the highest supported resolution (64 DIP × 2× scale = 128px).
 * The `tileSize` parameter is ignored and kept only for backward compatibility.
 * Chromium's `/_favicon/` parser reads `scaleFactor` (camelCase), not `scale_factor`.
 */
export function faviconRequestForTile(_tileSize?: TileSize): { requestSize: number, scaleFactor: 1 | 2 } {
  return { requestSize: 64, scaleFactor: 2 }
}

/**
 * Build a Manifest V3 extension favicon-cache URL for a page.
 * Returns null for blank, malformed, or non-http(s) input, or when the
 * extension runtime URL helper is unavailable (web preview).
 * Loading the URL fails on Firefox (no equivalent scheme); callers must
 * fall back to the default SVG.
 */
export function buildExtensionFaviconUrl(
  pageUrl: string,
  size = 64,
  extensionBase?: string,
  scaleFactor: 1 | 2 = 1,
): string | null {
  const trimmed = pageUrl.trim()
  if (!trimmed)
    return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    return null
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    return null
  const base = extensionBase ?? getExtensionFaviconBase()
  if (base == null)
    return null
  const url = new URL(base)
  url.searchParams.set('pageUrl', parsed.href)
  url.searchParams.set('size', String(clampFaviconSize(size)))
  if (scaleFactor === 2)
    url.searchParams.set('scaleFactor', '2x')
  return url.toString()
}

/** Resolve the `/_favicon/` base via the extension runtime when available. */
function getExtensionFaviconBase(): string | null {
  try {
    const getURL = window.chrome?.runtime?.getURL ?? window.browser?.runtime?.getURL
    if (!getURL)
      return null
    return getURL('/_favicon/')
  }
  catch {
    return null
  }
}

/**
 * Build a Chrome favicon-cache URL for a page. Throws for blank, malformed, or
 * non-http(s) input. Firefox has no equivalent scheme, so loading this there
 * fails and the caller must surface that as a load failure.
 */
export function buildChromeFaviconUrl(pageUrl: string, size = 64): string {
  const trimmed = pageUrl.trim()
  if (!trimmed)
    throw new Error('Enter a website address.')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    throw new Error('Use a complete address, such as https://example.com.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Favicons can only be read for http(s) pages.')
  }
  const clamped = Math.max(16, Math.min(MAX_FAVICON_SIZE, Math.floor(size) || 64))
  return `chrome://favicon2/size/${clamped}@1x/${parsed.href}`
}

export const UPLOAD_ALLOWLIST = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
]
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

/** Structural file shape so this stays DOM-free and unit testable. */
export function validateUploadFile(file: { type: string, size: number }): void {
  if (!UPLOAD_ALLOWLIST.includes(file.type)) {
    throw new Error(`Unsupported image type "${file.type || 'unknown'}". Use PNG, JPEG, WebP, ICO or SVG.`)
  }
  if (!(file.size > 0))
    throw new Error('That file looks empty.')
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error('That file is larger than 2 MB.')
}

/** Remote icon URLs must be http(s): anything else cannot be fetched or drawn safely. */
export function validateIconRemoteUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed)
    throw new Error('Enter an image address.')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    throw new Error('Use a complete address, such as https://example.com/icon.png.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Icon addresses must start with http(s).')
  }
  return trimmed
}

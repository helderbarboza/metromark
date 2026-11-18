// DOM-free cache policy for converted favicon glyphs (the "Original favicons"
// mode is deliberately not cached). Everything here stays unit-testable in
// node: byte hashing, key building, freshness decisions, and eviction.
// The IndexedDB plumbing lives in favicon-store.ts; the canvas decode lives
// in favicon-cache.ts.

/** Bump to invalidate every stored glyph (e.g. when the conversion changes). */
export const CACHE_VERSION = 1

/** Hard cap on stored glyphs; oldest entries are evicted first. */
export const MAX_ENTRIES = 500

/** How long a fingerprint check stays valid. Favicons are re-verified afterwards. */
const RECHECK_MS = 24 * 60 * 60 * 1000

/** One stored glyph. `created` drives LRU eviction; `lastChecked` drives revalidation. */
export interface GlyphRecord {
  key: string
  dataUrl: string
  created: number
  fingerprint: number
  lastChecked: number
}

/** Build the IndexedDB key for a converted glyph. `tintArgb` must be a 0xAARRGGBB value. */
export function glyphCacheKey(pageUrl: string, tintArgb: number): string {
  return `favicon:${CACHE_VERSION}:${(tintArgb >>> 0).toString(16)}:${pageUrl}`
}

/**
 * cyrb53 over raw bytes. Used to detect favicon changes from the decoded
 * pixels of a 16x16 downscale, so it is deterministic regardless of how the
 * browser encodes the `_favicon` PNG.
 */
export function fingerprintBytes(bytes: Uint8Array | Uint8ClampedArray): number {
  let h1 = 0xDEADBEEF
  let h2 = 0x41C6CE57
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index]
    h1 = Math.imul(h1 ^ byte, 2654435761)
    h2 = Math.imul(h2 ^ byte, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** True when no successful check happened within `recheckMs` (or the timestamp is unusable). */
export function needsRecheck(lastChecked: number, now: number, recheckMs = RECHECK_MS): boolean {
  return !(Number.isFinite(lastChecked) && lastChecked > 0) || now - lastChecked >= recheckMs
}

/** Keys of the oldest records to remove so `records` fits `cap`. Order of the input does not matter. */
export function evictOldest(records: ReadonlyArray<Pick<GlyphRecord, 'key' | 'created'>>, cap = MAX_ENTRIES): string[] {
  if (records.length <= cap)
    return []
  const sorted = [...records].sort((a, b) => a.created - b.created)
  return sorted.slice(0, records.length - cap).map(record => record.key)
}

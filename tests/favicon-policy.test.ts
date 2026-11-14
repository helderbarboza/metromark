import { CACHE_VERSION, evictOldest, fingerprintBytes, glyphCacheKey, MAX_ENTRIES, needsRecheck } from '$lib/favicon-policy'
import { describe, expect, it } from 'vitest'

describe('glyphCacheKey', () => {
  it('is stable for the same input and embeds the cache version and tint', () => {
    const tint = 0xFFFFFFFF >>> 0
    expect(glyphCacheKey('https://example.com/', tint)).toBe(`favicon:${CACHE_VERSION}:ffffffff:https://example.com/`)
    expect(glyphCacheKey('https://example.com/', tint)).toBe(glyphCacheKey('https://example.com/', tint))
  })

  it('differs between tints and between pages', () => {
    const white = 0xFFFFFFFF >>> 0
    const black = 0xFF000000 >>> 0
    expect(glyphCacheKey('https://example.com/', white)).not.toBe(glyphCacheKey('https://example.com/', black))
    expect(glyphCacheKey('https://a.example/', white)).not.toBe(glyphCacheKey('https://b.example/', white))
  })
})

describe('fingerprintBytes', () => {
  it('is deterministic for identical bytes', () => {
    const bytes = new Uint8Array(16 * 16 * 4).map((_, index) => (index * 31) & 0xFF)
    expect(fingerprintBytes(bytes)).toBe(fingerprintBytes(bytes))
  })

  it('changes when the pixels change', () => {
    const a = new Uint8Array(1024).fill(7)
    const b = new Uint8Array(1024).fill(7)
    b[500] = 8
    expect(fingerprintBytes(a)).not.toBe(fingerprintBytes(b))
  })

  it('handles empty input', () => {
    expect(() => fingerprintBytes(new Uint8Array(0))).not.toThrow()
  })
})

describe('needsRecheck', () => {
  const now = 1_700_000_000_000

  it('is false within the recheck window', () => {
    expect(needsRecheck(now - 60_000, now)).toBe(false)
  })

  it('is true once the window elapsed', () => {
    expect(needsRecheck(now - 25 * 60 * 60 * 1000, now)).toBe(true)
  })

  it('is true for missing or unusable timestamps', () => {
    expect(needsRecheck(0, now)).toBe(true)
    expect(needsRecheck(Number.NaN, now)).toBe(true)
  })
})

describe('evictOldest', () => {
  const records = Array.from({ length: MAX_ENTRIES + 2 }, (_, index) => ({ key: `k${index}`, created: index }))

  it('returns nothing when under the cap', () => {
    expect(evictOldest(records.slice(0, MAX_ENTRIES))).toEqual([])
  })

  it('evicts the oldest entries first when the cap is exceeded', () => {
    expect(evictOldest(records)).toEqual(['k0', 'k1'])
  })

  it('does not depend on input order', () => {
    const shuffled = [...records].reverse()
    expect(evictOldest(shuffled)).toEqual(['k0', 'k1'])
  })
})

import {
  clampDimensions,
  estimateDataUriBytes,
  isDataImageUri,
  isMediaKey,
  MAX_STORED_CHARACTERS,
  normalizeImageBackgroundSettings,
  validateBackgroundUrl,
  validateUploadFile,
} from '$lib/background-image'
import { SETTINGS_DEFAULTS } from '$lib/config'
import { describe, expect, it } from 'vitest'

describe('normalizeImageBackgroundSettings', () => {
  const withZoom = (parallaxZoom: number) => ({
    ...SETTINGS_DEFAULTS,
    background: { type: 'image' as const, url: '', parallaxZoom },
  })

  it('divides legacy whole-percentage values into factors', () => {
    expect(normalizeImageBackgroundSettings(withZoom(150)).background).toMatchObject({ parallaxZoom: 1.5 })
    expect(normalizeImageBackgroundSettings(withZoom(250)).background).toMatchObject({ parallaxZoom: 2.5 })
    expect(normalizeImageBackgroundSettings(withZoom(125)).background).toMatchObject({ parallaxZoom: 1.25 })
    expect(normalizeImageBackgroundSettings(withZoom(300)).background).toMatchObject({ parallaxZoom: 3 })
  })

  it('keeps in-range factors, clamps outliers and repairs NaN', () => {
    expect(normalizeImageBackgroundSettings(withZoom(2)).background).toMatchObject({ parallaxZoom: 2 })
    expect(normalizeImageBackgroundSettings(withZoom(0.2)).background).toMatchObject({ parallaxZoom: 1 })
    expect(normalizeImageBackgroundSettings(withZoom(99)).background).toMatchObject({ parallaxZoom: 1 })
    expect(normalizeImageBackgroundSettings(withZoom(Number.NaN)).background).toMatchObject({ parallaxZoom: 1.5 })
  })

  it('leaves non-image backgrounds untouched', () => {
    const color = { ...SETTINGS_DEFAULTS, background: { type: 'color' as const, auto: true } }
    expect(normalizeImageBackgroundSettings(color)).toBe(color)
  })
})

describe('validateBackgroundUrl', () => {
  it('accepts an empty value, http(s) addresses and base64 image data URIs', () => {
    expect(validateBackgroundUrl('')).toBe('')
    expect(validateBackgroundUrl('  https://example.com/a.jpg  ')).toBe('https://example.com/a.jpg')
    expect(validateBackgroundUrl('http://example.com/a.png')).toBe('http://example.com/a.png')
    expect(validateBackgroundUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(validateBackgroundUrl('data:image/svg+xml;base64,PHN2Zw==')).toBe('data:image/svg+xml;base64,PHN2Zw==')
    expect(validateBackgroundUrl('data:image/webp;base64,UklGRg==')).toBe('data:image/webp;base64,UklGRg==')
    expect(validateBackgroundUrl('idb:123e4567-e89b-42d3-a456-426655440000')).toBe('idb:123e4567-e89b-42d3-a456-426655440000')
  })

  it('rejects non-http(s) schemes and non-image data URIs', () => {
    expect(() => validateBackgroundUrl('ftp://example.com/a.png')).toThrow('http(s)')
    expect(() => validateBackgroundUrl('file:///etc/passwd')).toThrow('http(s)')
    expect(() => validateBackgroundUrl('javascript:alert(1)')).toThrow('http(s)')
    expect(() => validateBackgroundUrl('data:text/html;base64,PHN2Zz4=')).toThrow('Unsupported image data')
    expect(() => validateBackgroundUrl('data:image/png;base64,')).toThrow('Unsupported image data')
    expect(() => validateBackgroundUrl('idb:not-a-uuid')).toThrow('stored image reference')
    expect(() => validateBackgroundUrl('idb:')).toThrow('stored image reference')
    expect(() => validateBackgroundUrl('not a url')).toThrow('complete address')
  })

  it('rejects image data URIs larger than the stored cap', () => {
    const big = `data:image/png;base64,${'A'.repeat(MAX_STORED_CHARACTERS)}`
    expect(() => validateBackgroundUrl(big)).toThrow('too large')
  })
})

describe('isMediaKey', () => {
  it('matches idb UUID references only', () => {
    expect(isMediaKey('idb:123e4567-e89b-42d3-a456-426655440000')).toBe(true)
    expect(isMediaKey('idb:not-a-uuid')).toBe(false)
    expect(isMediaKey('idb:')).toBe(false)
    expect(isMediaKey('https://example.com/a.png')).toBe(false)
  })
})

describe('isDataImageUri', () => {
  it('matches base64 image payloads only', () => {
    expect(isDataImageUri('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
    expect(isDataImageUri('data:image/gif;base64,R0lGODdhAQABAIAAAP///////ywAAAAAAQABAAACAkQBADs=')).toBe(true)
    expect(isDataImageUri('data:image/png;base64,')).toBe(false)
    expect(isDataImageUri('data:text/plain;base64,aGVsbG8=')).toBe(false)
    expect(isDataImageUri('https://example.com/a.png')).toBe(false)
  })
})

describe('validateUploadFile', () => {
  it('accepts the documented image types within the size cap', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
      expect(() => validateUploadFile({ type, size: 5 * 1024 * 1024 })).not.toThrow()
  })

  it('rejects other types, empty files and oversized files', () => {
    expect(() => validateUploadFile({ type: 'image/bmp', size: 1024 })).toThrow('Unsupported image type')
    expect(() => validateUploadFile({ type: '', size: 1024 })).toThrow('Unsupported image type')
    expect(() => validateUploadFile({ type: 'image/png', size: 0 })).toThrow('empty')
    expect(() => validateUploadFile({ type: 'image/png', size: 26 * 1024 * 1024 })).toThrow('25 MB')
  })
})

describe('clampDimensions', () => {
  it('keeps small images unchanged', () => {
    expect(clampDimensions(800, 600)).toEqual({ width: 800, height: 600, scaled: false })
    expect(clampDimensions(2560, 1440)).toEqual({ width: 2560, height: 1440, scaled: false })
  })

  it('scales the longest edge to the cap while preserving the ratio', () => {
    expect(clampDimensions(5120, 2880)).toEqual({ width: 2560, height: 1440, scaled: true })
    const clamped = clampDimensions(1000, 5000)
    expect(clamped.height).toBe(2560)
    expect(clamped.width).toBe(512)
    expect(clamped.scaled).toBe(true)
  })

  it('clamps degenerate input to at least 1x1', () => {
    expect(clampDimensions(0, 0)).toEqual({ width: 1, height: 1, scaled: false })
    expect(clampDimensions(Number.NaN, 10)).toEqual({ width: 1, height: 10, scaled: false })
  })
})

describe('estimateDataUriBytes', () => {
  it('estimates decoded bytes from the base64 payload', () => {
    expect(estimateDataUriBytes('data:image/png;base64,AAAA')).toBe(3)
    expect(estimateDataUriBytes('data:image/png;base64,AA==')).toBe(1)
    expect(estimateDataUriBytes('data:image/png;base64,AAA=')).toBe(2)
  })

  it('returns 0 for non-base64 input', () => {
    expect(estimateDataUriBytes('https://example.com/a.png')).toBe(0)
    expect(estimateDataUriBytes('data:image/svg+xml,<svg></svg>')).toBe(0)
  })
})

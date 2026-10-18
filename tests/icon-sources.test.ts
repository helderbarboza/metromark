import { describe, expect, it } from 'vitest'
import {
  buildChromeFaviconUrl,
  classifyConvertError,
  failureHint,
  validateIconRemoteUrl,
  validateUploadFile,
} from '../src/lib/icon-sources'

describe('classifyConvertError', () => {
  it('maps canvas taint to cors-taint', () => {
    const tainted = new Error('Failed to execute \'getImageData\' on \'CanvasRenderingContext2D\': The canvas has been tainted by cross-origin data.')
    expect(classifyConvertError(tainted)).toBe('cors-taint')
    const named = new Error('denied')
    named.name = 'SecurityError'
    expect(classifyConvertError(named)).toBe('cors-taint')
  })
  it('maps unsupported inputs and load problems', () => {
    expect(classifyConvertError(new Error('Unsupported image type'))).toBe('unsupported-type')
    expect(classifyConvertError(new Error('image failed to load'))).toBe('load-failure')
  })
  it('falls back to unknown', () => {
    expect(classifyConvertError(new Error('boom'))).toBe('unknown')
    expect(classifyConvertError('boom')).toBe('unknown')
  })
  it('explains every kind', () => {
    for (const kind of ['cors-taint', 'load-failure', 'unsupported-type', 'unknown'] as const) {
      expect(failureHint(kind).length).toBeGreaterThan(0)
    }
  })
})

describe('buildChromeFaviconUrl', () => {
  it('builds a sized cache URL for http(s) pages', () => {
    expect(buildChromeFaviconUrl('https://example.com')).toBe('chrome://favicon/size/64@1x/https://example.com/')
    expect(buildChromeFaviconUrl('http://example.com/', 32)).toBe('chrome://favicon/size/32@1x/http://example.com/')
  })
  it('clamps sizes into range', () => {
    expect(buildChromeFaviconUrl('https://example.com', 512)).toContain('/size/64@1x/')
    expect(buildChromeFaviconUrl('https://example.com', 1)).toContain('/size/16@1x/')
  })
  it('rejects blank, malformed and non-http(s) input', () => {
    expect(() => buildChromeFaviconUrl('  ')).toThrow()
    expect(() => buildChromeFaviconUrl('not a url')).toThrow()
    expect(() => buildChromeFaviconUrl('javascript:alert(1)')).toThrow()
    expect(() => buildChromeFaviconUrl('ftp://example.com')).toThrow()
  })
})

describe('validateUploadFile', () => {
  it('accepts allowlisted images within the size cap', () => {
    expect(() => validateUploadFile({ type: 'image/png', size: 1024 })).not.toThrow()
    expect(() => validateUploadFile({ type: 'image/svg+xml', size: 64 })).not.toThrow()
  })
  it('rejects unknown types, empty and oversized files', () => {
    expect(() => validateUploadFile({ type: 'application/pdf', size: 1024 })).toThrow()
    expect(() => validateUploadFile({ type: '', size: 1024 })).toThrow()
    expect(() => validateUploadFile({ type: 'image/png', size: 0 })).toThrow()
    expect(() => validateUploadFile({ type: 'image/png', size: 3 * 1024 * 1024 })).toThrow()
  })
})

describe('validateIconRemoteUrl', () => {
  it('accepts http(s) addresses', () => {
    expect(validateIconRemoteUrl('  https://example.com/icon.png ')).toBe('https://example.com/icon.png')
  })
  it('rejects blank, relative and non-http(s) addresses', () => {
    expect(() => validateIconRemoteUrl('')).toThrow()
    expect(() => validateIconRemoteUrl('/icons/128.png')).toThrow()
    expect(() => validateIconRemoteUrl('data:image/png;base64,AAAA')).toThrow()
    expect(() => validateIconRemoteUrl('javascript:alert(1)')).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { foreground } from '../src/lib/color.js'
import { resolveTileColors } from '../src/lib/theme-colors.js'

describe('foreground', () => {
  it('returns black (0) for bright colors', () => {
    expect(foreground('#f9e2af')).toBe(0)
    expect(foreground('#ffffff')).toBe(0)
    expect(foreground('#ffff00')).toBe(0)
    expect(foreground('#00ff00')).toBe(0)
  })

  it('returns white (1) for dark colors', () => {
    expect(foreground('#000000')).toBe(1)
    expect(foreground('#1a1a1a')).toBe(1)
    expect(foreground('#af572f')).toBe(1)
    expect(foreground('#32767d')).toBe(1)
  })

  it('returns black for invalid/empty input', () => {
    expect(foreground('')).toBe(0)
    expect(foreground('#ggg')).toBe(0)
    expect(foreground('not-a-color')).toBe(0)
    expect(foreground('#12')).toBe(0)
  })

  it('supports 3-digit hex', () => {
    expect(foreground('#fff')).toBe(0)
    expect(foreground('#000')).toBe(1)
    expect(foreground('#f00')).toBe(0)
  })

  it('supports array input', () => {
    expect(foreground([255, 255, 255])).toBe(0)
    expect(foreground([0, 0, 0])).toBe(1)
  })
})

describe('resolveTileColors', () => {
  it('uses custom color when provided and valid', () => {
    const result = resolveTileColors({ color: '#123456', colorIndex: 0 })
    expect(result.bg).toBe('#123456')
  })

  it('normalizes 3-digit custom color', () => {
    const result = resolveTileColors({ color: '#abc', colorIndex: 0 })
    expect(result.bg).toBe('#aabbcc')
  })

  it('falls back to theme accent when custom color is empty', () => {
    const result = resolveTileColors({ color: '', colorIndex: 2 })
    expect(result.bg).not.toBe('')
    expect(result.bg.length).toBe(7)
    expect(result.bg.startsWith('#')).toBe(true)
  })

  it('falls back to theme accent when custom color is undefined', () => {
    const result = resolveTileColors({ color: undefined, colorIndex: 2 })
    expect(result.bg).not.toBe('')
    expect(result.bg.length).toBe(7)
    expect(result.bg.startsWith('#')).toBe(true)
  })

  it('falls back to theme accent when custom color is invalid', () => {
    const result = resolveTileColors({ color: 'not-a-color', colorIndex: 2 })
    expect(result.bg).not.toBe('')
    expect(result.bg.length).toBe(7)
    expect(result.bg.startsWith('#')).toBe(true)
  })

  it('returns correct foreground for fallback color', () => {
    const result = resolveTileColors({ color: '', colorIndex: 0 })
    expect(typeof result.fg).toBe('number')
    expect([0, 1]).toContain(result.fg)
  })
})

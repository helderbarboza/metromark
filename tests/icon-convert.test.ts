import {
  ALPHA_CUTOFF,
  alphaOf,
  blueOf,
  colorToCss,
  cssColorToArgb,
  FILLED_GLYPH_SCALE,
  greenOf,
  LUM_CUTOUT_PERCENTILE,
  redOf,
} from '$lib/icon-convert'
import { describe, expect, it } from 'vitest'

describe('icon-convert constants', () => {
  it('keeps the luminance cutout contract', () => {
    expect(ALPHA_CUTOFF).toBe(64)
    expect(LUM_CUTOUT_PERCENTILE).toBeCloseTo(0.7, 5)
    expect(FILLED_GLYPH_SCALE).toBeCloseTo(0.55, 5)
  })
})

describe('aRGB channel helpers', () => {
  it('extracts channels from a 0xAARRGGBB int', () => {
    const argb = 0x80402010
    expect(alphaOf(argb)).toBe(0x80)
    expect(redOf(argb)).toBe(0x40)
    expect(greenOf(argb)).toBe(0x20)
    expect(blueOf(argb)).toBe(0x10)
  })

  it('formats an ARGB int as CSS rgba', () => {
    expect(colorToCss(0xFFFF0000)).toBe('rgba(255,0,0,1)')
    expect(colorToCss(0x80000000)).toBe(`rgba(0,0,0,${0x80 / 255})`)
  })
})

describe('cssColorToArgb', () => {
  it('parses #rrggbb with full opacity', () => {
    expect(cssColorToArgb('#ff0000')).toBe(0xFFFF0000)
    expect(cssColorToArgb('#ffffff')).toBe(0xFFFFFFFF)
    expect(cssColorToArgb('#000000')).toBe(0xFF000000)
  })

  it('parses shorthand #rgb', () => {
    expect(cssColorToArgb('#f00')).toBe(0xFFFF0000)
  })

  it('parses alpha channels (#rrggbbaa CSS order)', () => {
    expect(cssColorToArgb('#ff000080')).toBe(0x80FF0000)
    expect(cssColorToArgb('#f008')).toBe(0x88FF0000)
  })

  it('rejects non-hex CSS colors', () => {
    expect(() => cssColorToArgb('red')).toThrow()
    expect(() => cssColorToArgb('#zzzzzz')).toThrow()
  })
})

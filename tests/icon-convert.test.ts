import { describe, expect, it } from 'vitest';
import {
  ALPHA_CUTOFF,
  FILLED_GLYPH_SCALE,
  LUM_CUTOUT_PERCENTILE,
  alphaOf,
  blueOf,
  colorToCss,
  cssColorToArgb,
  greenOf,
  redOf,
} from '../src/lib/icon-convert';

describe('icon-convert constants', () => {
  it('keeps the luminance cutout contract', () => {
    expect(ALPHA_CUTOFF).toBe(64);
    expect(LUM_CUTOUT_PERCENTILE).toBeCloseTo(0.7, 5);
    expect(FILLED_GLYPH_SCALE).toBeCloseTo(0.55, 5);
  });
});

describe('ARGB channel helpers', () => {
  it('extracts channels from a 0xAARRGGBB int', () => {
    const argb = 0x80402010;
    expect(alphaOf(argb)).toBe(0x80);
    expect(redOf(argb)).toBe(0x40);
    expect(greenOf(argb)).toBe(0x20);
    expect(blueOf(argb)).toBe(0x10);
  });

  it('formats an ARGB int as CSS rgba', () => {
    expect(colorToCss(0xffff0000)).toBe('rgba(255,0,0,1)');
    expect(colorToCss(0x80000000)).toBe(`rgba(0,0,0,${0x80 / 255})`);
  });
});

describe('cssColorToArgb', () => {
  it('parses #rrggbb with full opacity', () => {
    expect(cssColorToArgb('#ff0000')).toBe(0xffff0000);
    expect(cssColorToArgb('#ffffff')).toBe(0xffffffff);
    expect(cssColorToArgb('#000000')).toBe(0xff000000);
  });

  it('parses shorthand #rgb', () => {
    expect(cssColorToArgb('#f00')).toBe(0xffff0000);
  });

  it('parses alpha channels (#rrggbbaa CSS order)', () => {
    expect(cssColorToArgb('#ff000080')).toBe(0x80ff0000);
    expect(cssColorToArgb('#f008')).toBe(0x88ff0000);
  });

  it('rejects non-hex CSS colors', () => {
    expect(() => cssColorToArgb('red')).toThrow();
    expect(() => cssColorToArgb('#zzzzzz')).toThrow();
  });
});

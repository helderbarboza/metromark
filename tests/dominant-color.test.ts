import { extractDominantColor, nearestSwatchIndex, rgbToOklab } from '$lib/dominant-color'
import { describe, expect, it } from 'vitest'

type Pixel = [number, number, number, number]

function pixels(...colors: Pixel[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4)
  colors.forEach((color, index) => data.set(color, index * 4))
  return data
}

function repeat(color: Pixel, count: number): Pixel[] {
  return Array.from<Pixel>({ length: count }).fill(color)
}

describe('extractDominantColor', () => {
  it('picks the most common chromatic color', () => {
    const result = extractDominantColor(pixels(
      ...repeat([255, 0, 0, 255], 3),
      [0, 0, 255, 255],
      ...repeat([255, 255, 255, 255], 4),
    ))
    expect(result).toEqual([255, 0, 0])
  })

  it('ignores transparent pixels', () => {
    const result = extractDominantColor(pixels(
      ...repeat([0, 0, 255, 0], 6),
      [0, 200, 0, 255],
    ))
    expect(result).toEqual([0, 200, 0])
  })

  it('ignores near-white and near-black pixels', () => {
    const result = extractDominantColor(pixels(
      ...repeat([255, 255, 255, 255], 4),
      ...repeat([12, 12, 12, 255], 3),
      [30, 120, 220, 255],
    ))
    expect(result).toEqual([30, 120, 220])
  })

  it('returns null for grayscale-only icons', () => {
    const result = extractDominantColor(pixels(
      ...repeat([0, 0, 0, 255], 3),
      ...repeat([120, 120, 120, 255], 3),
      ...repeat([255, 255, 255, 255], 3),
    ))
    expect(result).toBeNull()
  })

  it('returns null for empty pixel data', () => {
    expect(extractDominantColor(new Uint8ClampedArray())).toBeNull()
  })
})

describe('nearestSwatchIndex', () => {
  const palette = ['#ff0000', '#00ff00', '#0000ff']

  it('selects the nearest swatch by hue', () => {
    expect(nearestSwatchIndex([250, 20, 20], palette)).toBe(0)
    expect(nearestSwatchIndex([20, 250, 20], palette)).toBe(1)
    expect(nearestSwatchIndex([20, 20, 250], palette)).toBe(2)
  })

  it('accepts three-digit swatches', () => {
    expect(nearestSwatchIndex([240, 20, 20], ['#f00', '#0f0'])).toBe(0)
  })

  it('maps a purple-blue favicon to a blue swatch', () => {
    const palette = ['#ca1243', '#d75f00', '#c18401', '#50a14f', '#0184bc', '#4078f2', '#a626a4', '#986801']
    expect(nearestSwatchIndex([100, 124, 233], palette)).toBe(5)
  })

  it('skips invalid swatches', () => {
    expect(nearestSwatchIndex([20, 250, 20], ['not-a-color', '#00ff00'])).toBe(1)
  })

  it('returns undefined for an empty palette', () => {
    expect(nearestSwatchIndex([20, 250, 20], [])).toBeUndefined()
  })
})

describe('rgbToOklab', () => {
  it('maps white to full lightness and black to zero', () => {
    expect(rgbToOklab([255, 255, 255])[0]).toBeCloseTo(1, 3)
    expect(rgbToOklab([0, 0, 0])[0]).toBeCloseTo(0, 3)
  })

  it('keeps grays at zero chroma', () => {
    const [, a, b] = rgbToOklab([128, 128, 128])
    expect(a).toBeCloseTo(0, 4)
    expect(b).toBeCloseTo(0, 4)
  })
})

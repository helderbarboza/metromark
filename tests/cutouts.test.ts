/* eslint-disable ts/consistent-type-assertions -- DOM canvas types cannot be constructed in the node test environment */
import type {
  CutoutContext,
  FitRect,
  WallpaperPlacement,
} from '$lib/cutouts'
import {
  clampCutoutZoom,
  createFitRect,
  createPlacement,
  drawCutouts,
  fitImageIntoBox,
  positionWallpaper,
} from '$lib/cutouts'
import { describe, expect, it, vi } from 'vitest'

function fakeSource(): CanvasImageSource {
  return { width: 100, height: 100 } as unknown as CanvasImageSource
}

function stubContext(): CutoutContext {
  return {
    fillStyle: '',
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }
}

describe('clampCutoutZoom', () => {
  it('falls back for missing or invalid values and clamps outliers', () => {
    expect(clampCutoutZoom(undefined)).toBe(1.5)
    expect(clampCutoutZoom(Number.NaN)).toBe(1.5)
    expect(clampCutoutZoom(0.2)).toBe(1)
    expect(clampCutoutZoom(99)).toBe(4)
    expect(clampCutoutZoom(2.25)).toBe(2.25)
  })
})

describe('positionWallpaper', () => {
  const placement: WallpaperPlacement = createPlacement()

  it('covers the viewport with no shift at zoom 1', () => {
    positionWallpaper(placement, 100, 80, 1, 0, false)
    expect(placement).toMatchObject({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    })
  })

  it('moves the wallpaper horizontally with scroll progress', () => {
    positionWallpaper(placement, 100, 80, 2, 0.5, false)
    expect(placement).toMatchObject({
      x: -50,
      y: -40,
      width: 200,
      height: 160,
    })
    positionWallpaper(placement, 100, 80, 2, 0, false)
    expect(placement.x).toBe(0)
    positionWallpaper(placement, 100, 80, 2, 1, false)
    expect(placement.x).toBe(-100)
  })

  it('pins the wallpaper under reduced motion', () => {
    positionWallpaper(placement, 100, 80, 2, 0, true)
    expect(placement.x).toBe(-50)
  })
})

describe('fitImageIntoBox', () => {
  const rect: FitRect = createFitRect()

  it('stretches for fill', () => {
    fitImageIntoBox(100, 50, 40, 40, 'fill', rect)
    expect(rect).toEqual({
      sx: 0,
      sy: 0,
      sw: 100,
      sh: 50,
      dx: 0,
      dy: 0,
      dw: 40,
      dh: 40,
    })
  })

  it('crops a wide image for cover by scaling it up', () => {
    fitImageIntoBox(200, 100, 100, 100, 'cover', rect)
    expect(rect).toMatchObject({
      sw: 200,
      sh: 100,
      dx: -50,
      dy: 0,
      dw: 200,
      dh: 100,
    })
  })

  it('letterboxes a wide image for contain', () => {
    fitImageIntoBox(200, 100, 100, 100, 'contain', rect)
    expect(rect).toMatchObject({
      sw: 200,
      sh: 100,
      dw: 100,
      dh: 50,
      dy: 25,
    })
  })
})

describe('drawCutouts', () => {
  function options(placement: WallpaperPlacement, overrides: Record<string, number> = {}) {
    return {
      source: fakeSource(),
      placement,
      scrollX: 0,
      scrollY: 0,
      originX: 0,
      originY: 0,
      viewportW: 100,
      viewportH: 100,
      dpr: 1,
      ...overrides,
    }
  }

  it('culls offscreen tiles and samples wallpaper pixels for visible ones', () => {
    const ctx = stubContext()
    const rects = new Float32Array([
      10,
      10,
      20,
      20,
      -40,
      10,
      20,
      20,
      200,
      10,
      20,
      20,
    ])
    const placement = createPlacement()
    positionWallpaper(placement, 100, 100, 2, 1, false)
    expect(placement.x).toBe(-100)
    const drawn = drawCutouts(ctx, rects, 3, options(placement, { dpr: 2 }))
    expect(drawn).toBe(1)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 100, 100)
    expect(ctx.drawImage).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      220,
      120,
      40,
      40,
      10,
      10,
      20,
      20,
    )
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
  })

  it('clips tiles that cross the viewport edge', () => {
    const ctx = stubContext()
    const rects = new Float32Array([90, 90, 30, 30])
    const placement = createPlacement()
    positionWallpaper(placement, 100, 100, 1, 0, false)
    drawCutouts(ctx, rects, 1, options(placement))
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      90,
      90,
      10,
      10,
      90,
      90,
      10,
      10,
    )
  })

  it('converts content-space rects through scroll and scroller origin', () => {
    const ctx = stubContext()
    const rects = new Float32Array([50, 0, 20, 20])
    const placement = createPlacement()
    positionWallpaper(placement, 100, 100, 1, 0, false)
    drawCutouts(ctx, rects, 1, options(placement, {
      scrollX: 50,
      originX: 8,
      originY: 64,
    }))
    // x = 50 - 50 + 8 = 8; y = 0 + 64 = 64.
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      8,
      64,
      20,
      20,
      8,
      64,
      20,
      20,
    )
  })
})

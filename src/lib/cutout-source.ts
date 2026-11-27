/**
 * Wallpaper providers for the cutout canvas. Each provider refreshes one
 * pre-scaled offscreen canvas in device pixels; the draw loop then samples that
 * single texture for every tile instead of downscaling a large image repeatedly.
 *
 * Sources are deliberately non-reactive: the CutoutCanvas component owns image
 * loading and selects a provider from the current background settings.
 */
import type {
  FitRect,
  WallpaperPlacement,
} from '$lib/cutouts'

import { createFitRect, fitImageIntoBox } from '$lib/cutouts'

export interface WallpaperSource {
  paint: (ctx: CanvasRenderingContext2D, placement: WallpaperPlacement, dpr: number) => void
}

function clear(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

/** Solid color, used for color backgrounds and the YouTube fallback. */
export function createColorSource(color: string): WallpaperSource {
  return {
    paint: (ctx) => {
      clear(ctx)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    },
  }
}

/** Theme background color, resolved at paint time so theme switches apply. */
export function createThemeColorSource(): WallpaperSource {
  return {
    paint: (ctx) => {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue('--background')
        .trim()
      clear(ctx)
      ctx.fillStyle = color || '#ffffff'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    },
  }
}

/** Decoded image with the page background's fit and opacity applied. */
export function createImageSource(
  image: HTMLImageElement,
  fit: 'cover' | 'contain' | 'fill',
  opacity: number,
): WallpaperSource {
  const rect: FitRect = createFitRect()
  return {
    paint: (ctx, placement, dpr) => {
      clear(ctx)
      fitImageIntoBox(
        image.naturalWidth,
        image.naturalHeight,
        placement.width * dpr,
        placement.height * dpr,
        fit,
        rect,
      )
      ctx.globalAlpha = opacity
      ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh)
      ctx.globalAlpha = 1
    },
  }
}

/**
 * Live WebGL canvas from ShaderBackground. The parent keeps this canvas mounted
 * and asks the shader renderer to preserve its drawing buffer while cutouts are
 * active, so it can be sampled at any point in the frame.
 */
export function createCanvasSource(canvas: HTMLCanvasElement): WallpaperSource {
  return {
    paint: (ctx, placement, dpr) => {
      clear(ctx)
      ctx.drawImage(canvas, 0, 0, placement.width * dpr, placement.height * dpr)
    },
  }
}

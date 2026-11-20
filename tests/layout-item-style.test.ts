import type { TileSize } from '$lib/types'
import { cellsToPx, GAP, layoutItemStyle, SIZES } from '$lib/layout'
import { describe, expect, it } from 'vitest'

describe('layoutItemStyle', () => {
  const cell = 64
  const sizes: TileSize[] = ['small', 'medium', 'wide', 'large']

  it('sets explicit pixel geometry for every tile preset', () => {
    for (const size of sizes) {
      const [w, h] = SIZES[size]
      const style = layoutItemStyle({ x: 2, y: 3, w, h }, cell)
      expect(style).toContain(`left: ${2 * (cell + GAP)}px`)
      expect(style).toContain(`top: ${3 * (cell + GAP)}px`)
      expect(style).toContain(`width: ${cellsToPx(w, cell)}px`)
      expect(style).toContain(`height: ${cellsToPx(h, cell)}px`)
    }
  })

  it('honours a custom gap', () => {
    const style = layoutItemStyle({ x: 1, y: 1, w: 2, h: 2 }, cell, 4)
    expect(style).toContain(`left: ${cell + 4}px`)
    expect(style).toContain(`width: ${2 * cell + 4}px`)
  })
})

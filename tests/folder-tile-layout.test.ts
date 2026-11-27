import { gridPlacements, layoutPlacements, titleRect, unitSize } from '$lib/folder-tile-layout'
import { describe, expect, it } from 'vitest'

describe('unitSize', () => {
  it('subtracts the gaps between columns', () => {
    expect(unitSize(101, 2, 1)).toBe(50)
  })

  it('returns 0 for empty boxes or no columns', () => {
    expect(unitSize(0, 2)).toBe(0)
    expect(unitSize(100, 0)).toBe(0)
  })
})

describe('gridPlacements', () => {
  it('fills row-major with 1x1 spans', () => {
    expect(gridPlacements(['a', 'b', 'c'], 2)).toEqual([
      {
        key: 'a',
        col: 0,
        row: 0,
        colSpan: 1,
        rowSpan: 1,
      },
      {
        key: 'b',
        col: 1,
        row: 0,
        colSpan: 1,
        rowSpan: 1,
      },
      {
        key: 'c',
        col: 0,
        row: 1,
        colSpan: 1,
        rowSpan: 1,
      },
    ])
  })
})

describe('layoutPlacements', () => {
  it('places 1x1 cells on whole pixels with a 1px gap', () => {
    const rects = layoutPlacements(gridPlacements(['a', 'b', 'c', 'd'], 2), {
      box: { width: 101, height: 101 },
      cols: 2,
      iconRows: 2,
    })
    expect(rects.get('a')).toEqual({ x: 0, y: 0, w: 50, h: 50 })
    expect(rects.get('b')).toEqual({ x: 51, y: 0, w: 50, h: 50 })
    expect(rects.get('c')).toEqual({ x: 0, y: 51, w: 50, h: 50 })
    expect(rects.get('d')).toEqual({ x: 51, y: 51, w: 50, h: 50 })
  })

  it('supports spans', () => {
    const rects = layoutPlacements(
      [
        {
          key: 'big',
          col: 0,
          row: 0,
          colSpan: 2,
          rowSpan: 2,
        },
      ],
      {
        box: { width: 101, height: 101 },
        cols: 2,
        iconRows: 2,
      },
    )
    expect(rects.get('big')).toEqual({ x: 0, y: 0, w: 101, h: 101 })
  })
})

describe('titleRect', () => {
  it('starts below the icon rows and fills the rest of the box', () => {
    // pitch = 50 + 1 = 51, so two icon rows end at y = 102
    expect(titleRect({
      box: { width: 101, height: 151 },
      cols: 2,
      iconRows: 2,
    })).toEqual({
      x: 0,
      y: 102,
      w: 101,
      h: 49,
    })
  })
})

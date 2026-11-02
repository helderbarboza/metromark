import {
  levelFps,
  levelFrame,
  levelWorst,
  nextLoad,
  snapFps,
  solveQuality,
} from '$lib/shaders/quality'
import { describe, expect, it } from 'vitest'

describe('snapFps', () => {
  it('snaps a ceiling down to a vsync boundary', () => {
    expect(snapFps(45, 60, 'down')).toBe(30)
    expect(snapFps(40, 60, 'down')).toBe(30)
    expect(snapFps(50, 60, 'down')).toBe(30)
  })

  it('snaps a floor up to a vsync boundary', () => {
    expect(snapFps(24, 60, 'up')).toBe(30)
    expect(snapFps(20, 60, 'up')).toBe(20)
    expect(snapFps(25, 60, 'up')).toBe(30)
  })

  it('handles a 120 Hz display', () => {
    expect(snapFps(60, 120, 'down')).toBe(60)
    expect(snapFps(120, 144, 'down')).toBe(72)
  })

  it('keeps an exact match', () => {
    expect(snapFps(60, 60, 'down')).toBe(60)
    expect(snapFps(30, 60, 'down')).toBe(30)
  })
})

describe('solveQuality', () => {
  it('motion pins fps and cuts scale', () => {
    const result = solveQuality('motion', 0.5, 0.5, 60, 60)
    expect(result.fps).toBe(60)
    expect(result.scale).toBeCloseTo(0.5 * Math.sqrt(0.5), 5)
  })

  it('detail pins scale and cuts fps', () => {
    const result = solveQuality('detail', 0.5, 0.5, 60, 60)
    expect(result.scale).toBe(0.5)
    expect(result.fps).toBe(30)
  })

  it('detail snaps the fps to a vsync boundary', () => {
    const result = solveQuality('detail', 0.4, 0.5, 60, 60)
    expect(result.fps).toBe(30)
  })

  it('detail keeps scale at the ceiling even at low load', () => {
    const result = solveQuality('detail', 0.2, 0.5, 60, 60)
    expect(result.scale).toBe(0.5)
    expect(result.fps).toBe(30)
  })

  it('never exceeds the ceilings', () => {
    const result = solveQuality('motion', 2, 0.5, 60, 60)
    expect(result.scale).toBeLessThanOrEqual(0.5)
    expect(result.fps).toBeLessThanOrEqual(60)
  })

  it('never goes below the floors', () => {
    const result = solveQuality('motion', 0, 0.5, 60, 60)
    expect(result.scale).toBeGreaterThanOrEqual(0.3)
  })
})

describe('nextLoad', () => {
  it('decreases by 25 percent', () => {
    expect(nextLoad(1, 'decrease', 0.25)).toBe(0.75)
    expect(nextLoad(0.75, 'decrease', 0.25)).toBeCloseTo(0.5625, 5)
  })

  it('increases by 5 percent', () => {
    expect(nextLoad(0.75, 'increase', 0.25)).toBeCloseTo(0.7875, 5)
  })

  it('clamps to the floor and ceiling', () => {
    expect(nextLoad(0.3, 'decrease', 0.25)).toBe(0.25)
    expect(nextLoad(0.98, 'increase', 0.25)).toBe(1)
  })
})

describe('metric levels', () => {
  it('levelFps', () => {
    expect(levelFps(60, 60)).toBe('normal')
    expect(levelFps(40, 60)).toBe('warn')
    expect(levelFps(20, 60)).toBe('danger')
  })

  it('levelFrame', () => {
    expect(levelFrame(16, 16)).toBe('normal')
    expect(levelFrame(26, 16)).toBe('warn')
    expect(levelFrame(45, 16)).toBe('danger')
  })

  it('levelWorst', () => {
    expect(levelWorst(16, 16)).toBe('normal')
    expect(levelWorst(35, 16)).toBe('warn')
    expect(levelWorst(55, 16)).toBe('danger')
  })
})

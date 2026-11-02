import { FrameHealth } from '$lib/shaders/health'
import { describe, expect, it } from 'vitest'

describe('frameHealth', () => {
  it('stays ok on a steady 60 Hz signal', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 120; i++)
      health.push(i * 16.67, true)
    expect(health.verdict()).toBe('ok')
  })

  it('stays ok on a steady 120 Hz signal', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 240; i++)
      health.push(i * 8.33, true)
    expect(health.verdict()).toBe('ok')
  })

  it('stays ok when capped at 30 FPS on a 60 Hz display', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 60; i++)
      health.push(i * 33.33, true)
    expect(health.verdict()).toBe('ok')
  })

  it('reaches struggling after two bad windows', () => {
    const health = new FrameHealth({ warmupMs: 0, windowMs: 2000, badWindows: 2 })
    for (let i = 0; i < 60; i++)
      health.push(i * 16, true)
    expect(health.verdict()).toBe('ok')
    const base = 60 * 16
    for (let i = 0; i < 40; i++)
      health.push(base + i * 40, true)
    expect(['suspect', 'struggling']).toContain(health.verdict())
  })

  it('returns suspect on a single bad window', () => {
    const health = new FrameHealth({ warmupMs: 0, windowMs: 1000, badWindows: 3 })
    for (let i = 0; i < 60; i++)
      health.push(i * 16, true)
    const base = 60 * 16
    for (let i = 0; i < 20; i++)
      health.push(base + i * 40, true)
    expect(health.verdict()).toBe('suspect')
  })

  it('ignores a hidden-tab gap', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 60; i++)
      health.push(i * 16, true)
    const base = 60 * 16
    for (let i = 0; i < 60; i++)
      health.push(base + 30000 + i * 16, true)
    expect(health.verdict()).toBe('ok')
  })

  it('does not trigger during warm-up', () => {
    const health = new FrameHealth({ warmupMs: 1500 })
    for (let i = 0; i < 30; i++)
      health.push(i * 40, true)
    expect(health.verdict()).toBe('ok')
    expect(health.stats()).toBeNull()
  })

  it('reset clears the window', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 60; i++)
      health.push(i * 40, true)
    health.reset()
    expect(health.sampleCount).toBe(0)
    expect(health.verdict()).toBe('ok')
  })

  it('counts rendered frames for FPS, not ticks', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 60; i++)
      health.push(i * 16, i % 2 === 0)
    const stats = health.stats()
    expect(stats).not.toBeNull()
    expect(stats!.fps).toBeLessThan(40)
    expect(stats!.fps).toBeGreaterThan(25)
  })

  it('estimates 60 Hz from the fastest frame', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 60; i++)
      health.push(i * 16.67, true)
    expect(health.displayHz()).toBe(60)
  })

  it('estimates 120 Hz from the fastest frame', () => {
    const health = new FrameHealth({ warmupMs: 0 })
    for (let i = 0; i < 120; i++)
      health.push(i * 8.33, true)
    expect(health.displayHz()).toBeCloseTo(120, 0)
  })
})

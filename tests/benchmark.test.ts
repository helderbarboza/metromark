import {
  BENCHMARK_LEVELS,
  classifyFrameTime,
  EXCELLENT_MAX_MS,
  GOOD_MAX_MS,
  MODERATE_MAX_MS,
  WEAK_MAX_MS,
} from '$lib/shaders/benchmark'
import { describe, expect, it } from 'vitest'

describe('classifyFrameTime', () => {
  it('classifies excellent at or below its threshold', () => {
    expect(classifyFrameTime(0)).toBe('excellent')
    expect(classifyFrameTime(EXCELLENT_MAX_MS)).toBe('excellent')
  })

  it('classifies good between excellent and its threshold', () => {
    expect(classifyFrameTime(EXCELLENT_MAX_MS + 0.01)).toBe('good')
    expect(classifyFrameTime(GOOD_MAX_MS)).toBe('good')
  })

  it('classifies moderate between good and its threshold', () => {
    expect(classifyFrameTime(GOOD_MAX_MS + 0.01)).toBe('moderate')
    expect(classifyFrameTime(MODERATE_MAX_MS)).toBe('moderate')
  })

  it('classifies weak between moderate and its threshold', () => {
    expect(classifyFrameTime(MODERATE_MAX_MS + 0.01)).toBe('weak')
    expect(classifyFrameTime(WEAK_MAX_MS)).toBe('weak')
  })

  it('classifies poor above the weak threshold', () => {
    expect(classifyFrameTime(WEAK_MAX_MS + 0.01)).toBe('poor')
    expect(classifyFrameTime(50)).toBe('poor')
  })
})

describe('bENCHMARK_LEVELS', () => {
  it('lists the five stages, best first', () => {
    expect(BENCHMARK_LEVELS).toEqual([
      'excellent',
      'good',
      'moderate',
      'weak',
      'poor',
    ])
  })

  it('has strictly increasing thresholds', () => {
    expect(EXCELLENT_MAX_MS).toBeLessThan(GOOD_MAX_MS)
    expect(GOOD_MAX_MS).toBeLessThan(MODERATE_MAX_MS)
    expect(MODERATE_MAX_MS).toBeLessThan(WEAK_MAX_MS)
  })
})

/**
 * Pure quality-control math for the animated background.
 *
 * The renderer owns one normalized load value. The preference decides which
 * knob (render scale or frame rate) is pinned; the engine solves the other.
 * All functions here are side-effect free and unit-testable.
 */

export type QualityPreference = 'motion' | 'detail'

export interface QualitySolution {
  scale: number
  fps: number
}

const SCALE_FLOOR = 0.3
const FPS_FLOOR = 24

export function snapFps(target: number, hz: number, direction: 'up' | 'down'): number {
  if (target <= 0 || hz <= 0)
    return Math.max(1, Math.round(target))
  if (direction === 'down') {
    const n = Math.ceil(hz / target)
    return hz / Math.max(1, n)
  }
  const n = Math.floor(hz / target)
  return hz / Math.max(1, n)
}

export function solveQuality(
  preference: QualityPreference,
  load: number,
  scale0: number,
  fps0: number,
  hz: number,
): QualitySolution {
  const floor = loadFloor(preference, scale0, fps0)
  const clampedLoad = clamp(load, floor, 1)
  if (preference === 'motion') {
    const scale = scale0 * Math.sqrt(clampedLoad)
    return { scale, fps: fps0 }
  }
  const raw = fps0 * clampedLoad
  const snapped = snapFps(raw, hz, 'down')
  return { scale: scale0, fps: snapped < FPS_FLOOR ? snapFps(FPS_FLOOR, hz, 'up') : snapped }
}

export function loadFloor(preference: QualityPreference, scale0: number, fps0: number): number {
  if (preference === 'motion')
    return (SCALE_FLOOR / scale0) ** 2
  return FPS_FLOOR / fps0
}

export function isFrozen(load: number, preference: QualityPreference, scale0: number, fps0: number): boolean {
  return load <= loadFloor(preference, scale0, fps0) * 0.99
}

export function nextLoad(load: number, kind: 'decrease' | 'increase', floor: number): number {
  if (kind === 'decrease')
    return clamp(load * 0.75, floor, 1)
  return clamp(load * 1.05, floor, 1)
}

export type MetricLevel = 'normal' | 'warn' | 'danger'

export function levelFps(fps: number, fps0: number): MetricLevel {
  if (fps0 <= 0)
    return 'normal'
  const ratio = fps / fps0
  if (ratio < 0.5)
    return 'danger'
  if (ratio < 0.8)
    return 'warn'
  return 'normal'
}

export function levelFrame(frameMs: number, nominalMs: number): MetricLevel {
  if (nominalMs <= 0)
    return 'normal'
  const ratio = frameMs / nominalMs
  if (ratio > 2.5)
    return 'danger'
  if (ratio > 1.5)
    return 'warn'
  return 'normal'
}

export function levelWorst(worstMs: number, nominalMs: number): MetricLevel {
  if (nominalMs <= 0)
    return 'normal'
  const ratio = worstMs / nominalMs
  if (ratio > 3)
    return 'danger'
  if (ratio > 2)
    return 'warn'
  return 'normal'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

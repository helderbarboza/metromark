/**
 * Runtime frame-health sampler for the animated background.
 */

export interface HealthStats {
  fps: number
  frameMs: number
  worstMs: number
  samples: number
}

export type HealthVerdict = 'ok' | 'suspect' | 'struggling'

export interface FrameHealthOptions {
  warmupMs?: number
  windowMs?: number
  badWindows?: number
}

const DEFAULTS: Required<FrameHealthOptions> = {
  warmupMs: 1500,
  windowMs: 2000,
  badWindows: 2,
}

interface Sample {
  at: number
  rendered: boolean
}

export class FrameHealth {
  private readonly warmupMs: number
  private readonly windowMs: number
  private readonly badWindows: number
  private samples: Sample[] = []
  private startedAt: number | null = null
  private warmupEnd: number | null = null
  private badCount = 0

  constructor(options: FrameHealthOptions = {}) {
    this.warmupMs = options.warmupMs ?? DEFAULTS.warmupMs
    this.windowMs = options.windowMs ?? DEFAULTS.windowMs
    this.badWindows = options.badWindows ?? DEFAULTS.badWindows
  }

  push(now: number, rendered: boolean): void {
    if (this.startedAt === null) {
      this.startedAt = now
      this.warmupEnd = now + this.warmupMs
    }
    this.samples.push({ at: now, rendered })
    const cutoff = now - this.windowMs
    while (this.samples.length > 0 && this.samples[0].at < cutoff)
      this.samples.shift()
  }

  reset(): void {
    this.samples = []
    this.startedAt = null
    this.warmupEnd = null
    this.badCount = 0
  }

  deferWarmup(now: number, ms: number): void {
    this.warmupEnd = now + ms
  }

  get sampleCount(): number {
    return this.samples.length
  }

  displayHz(): number {
    if (this.samples.length < 3)
      return 0
    const min = minDelta(this.samples)
    if (min <= 0)
      return 0
    return clamp(1000 / min, 60, 240)
  }

  stats(): HealthStats | null {
    if (this.startedAt === null || this.samples.length < 2)
      return null
    const now = this.samples[this.samples.length - 1].at
    if (this.warmupEnd != null && now < this.warmupEnd)
      return null
    return computeStats(this.samples)
  }

  verdict(): HealthVerdict {
    if (this.startedAt === null || this.samples.length < 10)
      return 'ok'
    const now = this.samples[this.samples.length - 1].at
    if (this.warmupEnd != null && now < this.warmupEnd)
      return 'ok'
    const stats = computeStats(this.samples)
    if (!stats)
      return 'ok'
    const nominal = minDelta(this.samples)
    if (nominal <= 0)
      return 'ok'
    const p50Ratio = stats.frameMs / nominal
    const p90Ratio = stats.worstMs / nominal
    const bad = p50Ratio > 1.5 && p90Ratio > 2
    if (bad) {
      this.badCount++
      if (this.badCount >= this.badWindows)
        return 'struggling'
      return 'suspect'
    }
    this.badCount = 0
    return 'ok'
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function minDelta(samples: Sample[]): number {
  let min = Infinity
  for (let i = 1; i < samples.length; i++) {
    const delta = samples[i].at - samples[i - 1].at
    if (delta > 0 && delta < min)
      min = delta
  }
  return Number.isFinite(min) ? min : 0
}

function computeStats(samples: Sample[]): HealthStats {
  const deltas: number[] = []
  let rendered = 0
  for (let i = 1; i < samples.length; i++)
    deltas.push(samples[i].at - samples[i - 1].at)
  for (const sample of samples) {
    if (sample.rendered)
      rendered++
  }
  deltas.sort((a, b) => a - b)
  const p50 = percentile(deltas, 0.5)
  const p90 = percentile(deltas, 0.9)
  const span = samples[samples.length - 1].at - samples[0].at
  const fps = span > 0 ? (rendered / span) * 1000 : 0
  return { fps, frameMs: p50, worstMs: p90, samples: samples.length }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0)
    return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[index]
}

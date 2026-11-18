/**
 * Offscreen micro-benchmark for the shader background picker.
 *
 * Each shader is rendered on its own hidden canvas at a fixed 480x270 size
 * with a render scale of 1. Warm-up frames let temporal buffers settle and
 * image channels decode; measured frames are timed individually around the
 * draw submission (`gl.readPixels` forces the pipeline to drain, so vsync
 * cannot hide the real cost).
 *
 * The benchmark runs shaders sequentially, one at a time, by design: parallel
 * runs would contend for the same GPU and skew every result.
 */
import type { ShaderDefinition } from './types'
import { createPipeline, getContext } from './pipeline'

const BENCHMARK_SIZE = { width: 480, height: 270 } as const
const WARMUP_FRAMES = 20
const MEASURE_FRAMES = 50

/** How long to wait for image channels to decode before measuring. */
const IMAGES_TIMEOUT_MS = 3000

/** Frame-time buckets in milliseconds, calibrated at 480x270 / scale 1. */
export const EXCELLENT_MAX_MS = 2
export const GOOD_MAX_MS = 4
export const MODERATE_MAX_MS = 6
export const WEAK_MAX_MS = 8.3

export const BENCHMARK_LEVELS = [
  'excellent',
  'good',
  'moderate',
  'weak',
  'poor',
] as const
export type BenchmarkLevel = (typeof BENCHMARK_LEVELS)[number]

export function classifyFrameTime(avgFrameMs: number): BenchmarkLevel {
  if (avgFrameMs <= EXCELLENT_MAX_MS)
    return 'excellent'
  if (avgFrameMs <= GOOD_MAX_MS)
    return 'good'
  if (avgFrameMs <= MODERATE_MAX_MS)
    return 'moderate'
  if (avgFrameMs <= WEAK_MAX_MS)
    return 'weak'
  return 'poor'
}

export interface ShaderBenchmarkResult {
  shaderId: string
  status: 'ok' | 'failed'
  avgFrameMs: number
  worstFrameMs: number
  /** Null when the benchmark failed (e.g. WebGL unavailable). */
  level: BenchmarkLevel | null
}

function failedResult(shaderId: string): ShaderBenchmarkResult {
  return {
    shaderId,
    status: 'failed',
    avgFrameMs: 0,
    worstFrameMs: 0,
    level: null,
  }
}

/** Yield one frame so the page stays responsive and progress can repaint. */
async function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

export interface BenchmarkShaderOptions {
  /** Cancellation; honored between frames, never inside one draw. */
  signal?: AbortSignal
}

/**
 * Benchmark a single shader on a fresh, hidden canvas and context.
 * Never throws; failures come back as `status: 'failed'`.
 * Returns `null` when the run was aborted through `options.signal` — the
 * in-flight shader is neither ok nor failed, and nothing is recorded for it.
 *
 * Note: cancellation is checked between rAF yields, so a single synchronous
 * `gl.readPixels` cannot be interrupted. On real GPUs that stall is short; on
 * software rasterizers a heavy shader can take seconds to stop.
 */
export async function benchmarkShader(
  definition: ShaderDefinition,
  options: BenchmarkShaderOptions = {},
): Promise<ShaderBenchmarkResult | null> {
  const canvas = document.createElement('canvas')
  const context = getContext(canvas)
  if (!context)
    return failedResult(definition.id)
  const { gl, webgl2 } = context

  const { signal } = options
  let dispose: (() => void) | null = null
  try {
    // The pipeline sizes the canvas through `renderSize`; the benchmark ignores
    // the scale argument and always uses the fixed benchmark resolution.
    const pipeline = createPipeline({
      gl,
      webgl2,
      canvas,
      definition,
      renderSize: () => ({ ...BENCHMARK_SIZE }),
      initialScale: 1,
      paused: false,
      redrawOnImage: false,
      mouseState: { enabled: false },
    })
    dispose = pipeline.dispose

    for (let i = 0; i < WARMUP_FRAMES; i++) {
      if (signal?.aborted === true)
        return null
      pipeline.renderFrame(i / 60)
      await nextFrame()
    }
    // Image channels are created lazily; noise is bound until the decode lands.
    // Wait for the real textures so the measured cost matches what the page shows.
    const deadline = performance.now() + IMAGES_TIMEOUT_MS
    while (!pipeline.imagesSettled() && performance.now() < deadline) {
      if (signal?.aborted === true)
        return null
      await nextFrame()
    }

    const times: number[] = []
    // A 1x1 readPixels is the only stall every backend honors: it cannot return
    // until all prior GL commands complete. gl.finish() returns early on some
    // backends (observed ~0 ms for a deliberately heavy shader on headless
    // ANGLE/SwiftShader), so the frame cost would be invisible there.
    const pixel = new Uint8Array(4)
    for (let i = 0; i < MEASURE_FRAMES; i++) {
      if (signal?.aborted === true)
        return null
      // Yield outside the timed window so progress paints and the GPU queue drains.
      await nextFrame()
      const start = performance.now()
      pipeline.renderFrame((WARMUP_FRAMES + i) / 60)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      times.push(performance.now() - start)
    }

    const avg = times.reduce((sum, value) => sum + value, 0) / times.length
    const worst = Math.max(...times)
    return {
      shaderId: definition.id,
      status: 'ok',
      avgFrameMs: avg,
      worstFrameMs: worst,
      level: classifyFrameTime(avg),
    }
  }
  catch (error) {
    console.error(`[benchmark] Unable to benchmark the "${definition.id}" shader.`, error)
    return failedResult(definition.id)
  }
  finally {
    dispose?.()
    // Release the context so repeated runs do not pile up WebGL contexts.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

/**
 * In-memory results for the shader benchmark, shared between the
 * background picker and anything that wants to know how a shader
 * performs on this PC.
 *
 * State lives in the module, so it survives tab switches inside the
 * editor but not a page reload — that is deliberate; reloading the
 * tab discards the results.
 */
import type { ShaderBenchmarkResult } from './benchmark'
import { SvelteMap } from 'svelte/reactivity'
import { benchmarkShader } from './benchmark'
import { shaders } from './index'

export type { BenchmarkLevel, ShaderBenchmarkResult } from './benchmark'

/** Registry order matches the picker grid. */
const BENCHMARK_SHADERS = Object.values(shaders)

const results = new SvelteMap<string, ShaderBenchmarkResult>()
let running = $state(false)
let done = $state(0)
let total = $state(0)
let currentShaderId = $state<string | null>(null)
/** Set when every benchmark failed (e.g. WebGL unavailable). */
let failure = $state<string | null>(null)
/** True after the most recent run was cancelled by the user. */
let cancelled = $state(false)
/** Active controller for the in-flight run; null when idle. */
let activeRun: AbortController | null = null

export const shaderBenchmark = {
  get running() {
    return running
  },
  get done() {
    return done
  },
  get total() {
    return total
  },
  /** Id of the shader currently being benchmarked, null when idle. */
  get currentShaderId() {
    return currentShaderId
  },
  get failure() {
    return failure
  },
  get cancelled() {
    return cancelled
  },
  hasResults(): boolean {
    return results.size > 0
  },
  resultFor(shaderId: string): ShaderBenchmarkResult | null {
    return results.get(shaderId) ?? null
  },
}

/** Cancel the in-flight run, if any. Shaders already measured keep their results. */
export function cancelShaderBenchmarks(): void {
  activeRun?.abort()
}

export async function runShaderBenchmarks(): Promise<void> {
  if (running)
    return
  const controller = new AbortController()
  activeRun = controller
  running = true
  cancelled = false
  failure = null
  done = 0
  total = BENCHMARK_SHADERS.length
  results.clear()
  let failedCount = 0
  for (const definition of BENCHMARK_SHADERS) {
    if (controller.signal.aborted)
      break
    currentShaderId = definition.id
    const result = await benchmarkShader(definition, { signal: controller.signal })
    if (controller.signal.aborted)
      break
    if (result === null)
      break
    if (result.status === 'failed')
      failedCount++
    results.set(definition.id, result)
    done++
  }
  if (controller.signal.aborted)
    cancelled = true
  else if (failedCount === BENCHMARK_SHADERS.length)
    failure = 'WebGL is unavailable; the shaders cannot be benchmarked on this device.'
  currentShaderId = null
  activeRun = null
  running = false
}

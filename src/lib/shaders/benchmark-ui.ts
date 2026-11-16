/**
 * Presentation for the benchmark signal icon, shared by the shader picker
 * (`ShaderThumb.svelte`) and the legend below it.
 *
 * The five stages interpolate a neutral → amber → red ramp using the three
 * existing theme tokens; the middle two mix adjacent tokens with color-mix.
 * The stage name itself is translated via `$LL.benchmarkLevels[level]()`.
 */
import type { IconName } from '$lib/icons'
import type { BenchmarkLevel } from './benchmark'

export interface BenchmarkPresentation {
  icon: IconName
  /** Tailwind class with the stage color (color-mix ramp). */
  class: string
}

export const BENCHMARK_PRESENTATION: Record<BenchmarkLevel, BenchmarkPresentation> = {
  excellent: {
    icon: 'signalExcellent',
    class: 'text-(--foreground)',
  },
  good: {
    icon: 'signalGood',
    class: 'text-[color-mix(in_srgb,var(--foreground)_50%,var(--warn)_50%)]',
  },
  moderate: {
    icon: 'signalModerate',
    class: 'text-(--warn)',
  },
  weak: {
    icon: 'signalWeak',
    class: 'text-[color-mix(in_srgb,var(--warn)_50%,var(--destructive)_50%)]',
  },
  poor: {
    icon: 'signalPoor',
    class: 'text-(--destructive)',
  },
}

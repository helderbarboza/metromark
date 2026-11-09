/**
 * Presentation for the benchmark signal icon, shared by the shader picker
 * (`ShaderThumb.svelte`) and the legend below it.
 *
 * The five stages interpolate a neutral → amber → red ramp using the three
 * existing theme tokens; the middle two mix adjacent tokens with color-mix.
 */
import type { IconName } from '$lib/icons'
import type { BenchmarkLevel } from './benchmark'

export interface BenchmarkPresentation {
  icon: IconName
  /** Tailwind class with the stage color (color-mix ramp). */
  class: string
  /** One-word stage name. */
  short: string
}

export const BENCHMARK_PRESENTATION: Record<BenchmarkLevel, BenchmarkPresentation> = {
  excellent: {
    icon: 'signalExcellent',
    class: 'text-(--foreground)',
    short: 'Excellent',
  },
  good: {
    icon: 'signalGood',
    class: 'text-[color-mix(in_srgb,var(--foreground)_50%,var(--warn)_50%)]',
    short: 'Good',
  },
  moderate: {
    icon: 'signalModerate',
    class: 'text-(--warn)',
    short: 'Marginal',
  },
  weak: {
    icon: 'signalWeak',
    class: 'text-[color-mix(in_srgb,var(--warn)_50%,var(--destructive)_50%)]',
    short: 'Weak',
  },
  poor: {
    icon: 'signalPoor',
    class: 'text-(--destructive)',
    short: 'Poor',
  },
}

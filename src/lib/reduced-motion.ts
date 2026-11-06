// Reduced-motion check for WAAPI-driven Svelte transitions. A CSS
// prefers-reduced-motion rule has no effect on them, so components read this
// helper instead of relying on the `.reduced` class rule. Svelte evaluates
// transition params when the transition starts, so callers get the current
// value at transition time.
import { prefersReducedMotion } from 'svelte/motion'

/** Transition duration in milliseconds, or 0 under reduced motion. */
export function motionDuration(ms: number): number {
  if (prefersReducedMotion.current)
    return 0

  if (typeof document !== 'undefined' && document.querySelector('.reduced'))
    return 0

  return ms
}

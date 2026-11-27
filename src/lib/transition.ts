import type { EasingFunction, TransitionConfig } from 'svelte/transition'
import { cubicOut } from 'svelte/easing'

const HINGES = {
  left: { axis: 'y', sign: 1, origin: 'left center' },
  right: { axis: 'y', sign: -1, origin: 'right center' },
  top: { axis: 'x', sign: -1, origin: 'center top' },
  bottom: { axis: 'x', sign: 1, origin: 'center bottom' },
  center: { axis: 'y', sign: 1, origin: 'center center' },
}

interface Flip3dParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
  hinge?: keyof typeof HINGES
  origin?: string
  axis?: 'x' | 'y'
  angle?: number
  direction?: number
  perspective?: number
  fade?: boolean
  startScale?: number
}

export function flip3d(
  node: Element,
  {
    delay = 0,
    duration = 600,
    easing = cubicOut,
    hinge = 'left', // 'left' | 'right' | 'top' | 'bottom' | 'center'
    origin, // optional custom transform-origin, overrides hinge's
    axis, // optional 'X' | 'Y' override
    angle = 90,
    direction = 1, // -1 swings the other way (toward the viewer)
    perspective = 800,
    fade = false, // also fade opacity
    startScale = 1,
  }: Flip3dParams = {},
): TransitionConfig {
  const currentHinge = HINGES[hinge] ?? HINGES.left
  const currentAxis = (axis ?? currentHinge.axis).toUpperCase()
  const style = getComputedStyle(node)
  const existing = style.transform === 'none'
    ? ''
    : style.transform
  const baseOpacity = +style.opacity
  const sd = 1 - startScale

  return {
    delay,
    duration,
    easing,
    css: (progress, remaining) => `
    transform-origin: ${origin ?? currentHinge.origin};
    transform: ${existing} perspective(${perspective}px) rotate${currentAxis}(${remaining * angle * currentHinge.sign * direction}deg) scale(${1 - sd * remaining});
    backface-visibility: hidden;
    ${fade
      ? `opacity: ${progress * baseOpacity};`
      : ''}
  `,
  }
}

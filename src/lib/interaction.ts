/**
 * Tile pointer interaction rules.
 *
 * Cross-slide guidelines: touch has a small distance threshold (2.7 mm, roughly
 * 10 px at 1x) before a gesture counts as anything at all, and a larger one that
 * separates selecting an item from dragging it. A release before the larger
 * threshold selects; crossing it picks the tile up.
 *
 * The gesture must run perpendicular to the direction the surface pans, and
 * this canvas pans horizontally - so only a mostly-vertical drag selects or
 * moves a tile. A horizontal swipe is left to the canvas to pan.
 */

/** Distance before a touch drag means anything: reveals the selection check. */
export const REVEAL_PX = 10
/**
 * Distance before a tile is picked up for a move rather than only selected.
 * Doubles as the grid's drag activation threshold, so a release between
 * {@link REVEAL_PX} and this value can still select instead of moving.
 */
export const DRAG_PX = 24

export interface Point {
  x: number
  y: number
}

export type CrossSlideState = 'idle' | 'armed' | 'dragging' | 'panning'
export type ReleaseOutcome = 'open' | 'select' | 'ignore'

export interface Gesture {
  origin: Point
  state: CrossSlideState
}

export const startGesture = (origin: Point): Gesture => ({ origin, state: 'idle' })

/** Classifies a touch position relative to where the gesture started. */
export function crossSlideState(gesture: Gesture, point: Point): CrossSlideState {
  const dx = point.x - gesture.origin.x
  const dy = point.y - gesture.origin.y
  const distance = Math.hypot(dx, dy)
  if (distance < REVEAL_PX)
    return 'idle'
  // Perpendicular to the pan direction: a horizontal swipe belongs to the canvas.
  if (Math.abs(dx) > Math.abs(dy))
    return 'panning'
  return distance >= DRAG_PX ? 'dragging' : 'armed'
}

/**
 * Advances a gesture. Panning and dragging are terminal for this layer: the
 * canvas owns a pan, and the grid owns a drag once it has started.
 */
export function advanceGesture(gesture: Gesture, point: Point): Gesture {
  if (gesture.state === 'panning' || gesture.state === 'dragging')
    return gesture
  const state = crossSlideState(gesture, point)
  return state === gesture.state ? gesture : { ...gesture, state }
}

/** What a pointer release means for the tile the gesture started on. */
export function releaseOutcome(gesture: Gesture): ReleaseOutcome {
  if (gesture.state === 'armed')
    return 'select'
  if (gesture.state === 'idle')
    return 'open'
  return 'ignore'
}

/**
 * Selecting is marking without launching. Re-selecting the same
 * tile cancels it, which is how a cross-slide on an already selected item
 * removes it from the selection. Multi-select is a planned
 * follow-up for the app bar: swap the single id for a set here and in
 * `App.svelte`.
 */
export function toggleSelection(current: string | null, id: string): string | null {
  return current === id ? null : id
}

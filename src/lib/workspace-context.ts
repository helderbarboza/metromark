import type { TileSize } from '$lib/types'
import { createContext } from 'svelte'

export interface WorkspaceState {
  /** A drag gesture is in flight. */
  dragging: boolean
  /** The single selected bookmark id, or null. */
  selectedId: string | null
  /** The app "Reduce motion" setting or the OS reduced-motion preference. */
  reducedMotion: boolean
  /** Show full-color favicons instead of single-color Metro glyphs. */
  originalFavicons: boolean
  /** Tile sizes the active view offers, smallest first. */
  sizes: readonly TileSize[]
}

/**
 * App-owned workspace state for components deep in the tree (tiles, groups).
 * Set once by the root component as a getter closure so consumers reading it
 * inside `$derived` stay reactive. Without a provider (e.g. in stories),
 * `hasWorkspace()` returns false and consumers must fall back to defaults.
 */
export const [getWorkspace, setWorkspace, hasWorkspace]
  = createContext<(() => WorkspaceState) | undefined>()

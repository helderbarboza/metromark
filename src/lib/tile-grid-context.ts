import { createContext } from 'svelte'

export interface TileGridMetrics {
  cell?: number
  gap?: number
}

export const [getTileGrid, setTileGrid, hasTileGrid] = createContext<(() => TileGridMetrics) | undefined>()

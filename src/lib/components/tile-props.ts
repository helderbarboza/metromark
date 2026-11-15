import type { TileSize } from '$lib/types'

/**
 * Props shared by TileShell and the concrete tiles (MetroTile, FolderTile).
 * Keep these names stable: GridTile, MetroGroup and the stories pass them.
 */
export interface CommonTileProps {
  size: TileSize
  selected?: boolean
  revealed?: boolean
  draggable?: boolean
  class?: string
  style?: string
  dataTestId?: string
  dataGridId?: string
  /** Tile id for plain (non-draggable) tiles so context menus can find the owner. */
  dataTileId?: string
  dataDragging?: boolean
  attach?: (node: HTMLElement) => void | (() => void)
  /** Accessible name. Falls back to the shell's `defaultLabel` when omitted. */
  ariaLabel?: string
  ariaRoleDescription?: string
  tooltip?: string
  /** Called with the target size on quick grow/shrink tap. Omit to hide it. */
  onresize?: (size: TileSize) => void
  onclick?: (event: MouseEvent) => void
  onpointerdown?: (event: PointerEvent) => void
  onpointermove?: (event: PointerEvent) => void
  onpointerup?: (event: PointerEvent) => void
  onpointercancel?: (event: PointerEvent) => void
}

/** Colors handed to the shell's `content` snippet so children do not re-resolve them. */
export interface TileContentArgs {
  bg: string
  fg: string
}

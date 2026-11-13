import type { Settings } from '$lib/config'
import type { Layout, LayoutItem } from '@snapgridjs/core'

export type { Compactor, Layout, LayoutItem } from '@snapgridjs/core'

export type TileSize = 'small' | 'medium' | 'wide' | 'large'
export type TileKind = 'bookmark' | 'folder'
export interface MetroTileDef {
  title: string
  colorIndex: number
  color?: string
  badge?: string | number
  url?: string
}
/** One preview cell inside a folder tile. Rendered read-only; not interactive. */
export interface PreviewCell {
  id: string
  kind: TileKind
  title: string
  /** Bookmark cells only: favicon source and the bookmark's own tile colors. */
  url?: string
  colorIndex?: number
  color?: string
}

export interface BookmarkNode {
  id: string
  parentId?: string
  index?: number
  title: string
  url?: string
  type?: 'bookmark' | 'folder' | 'separator'
  folderType?: string
  unmodifiable?: string
  syncing?: boolean
  children?: BookmarkNode[]
}
export interface CreateNode {
  parentId: string
  title?: string
  url?: string
  index?: number
  type?: 'separator'
}
export interface Appearance { size?: TileSize, colorIndex?: number, color?: string }
export type ThemeName
  = | 'one-light'
    | 'github'
    | 'solarized-light'
    | 'tokyo-night-light'
    | 'catppuccin-latte'
    | 'one-dark'
    | 'github-dark'
    | 'solarized-dark'
    | 'tokyo-night-moon'
    | 'catppuccin-mocha'
    | 'catppuccin-macchiato'
    | 'catppuccin-frappe'
export type { Settings }
export interface DeletedBackup {
  node: BookmarkNode
  parentId: string
  index: number
  precedingId?: string
  followingId?: string
  appearance: Record<string, Appearance>
  layouts: Record<string, Layout>
  position?: LayoutItem
}
export interface UndoRecord {
  id: string
  label: string
  phase: 'prepared' | 'committed'
  expiresAt: number
  payload:
    | {
      kind: 'delete'
      backup: DeletedBackup
      restored?: Record<string, string>
      destination?: string
    }
    | {
      kind: 'move'
      nodeId: string
      oldParent: string
      oldIndex: number
      expectedParent: string
      position?: LayoutItem
    }
    | {
      kind: 'update'
      nodeId: string
      before: { title: string, url?: string }
      after: { title: string, url?: string }
    }
    | {
      kind: 'layouts'
      before: Record<string, Layout>
    }
}
export interface AppData {
  schema: 1
  appearance: Record<string, Appearance>
  layouts: Record<string, Layout>
  settings: Settings
  undos: UndoRecord[]
}
export interface UndoSummary {
  id: string
  label: string
  expiresAt: number
  needsDestination: boolean
}
export interface Snapshot {
  tree: BookmarkNode[]
  appearance: Record<string, Appearance>
  layouts: Record<string, Layout>
  settings: Settings
  undos: UndoSummary[]
  revision: number
  mode: 'preview' | 'extension'
}
export interface BookmarkTileView extends MetroTileDef {
  id: string
  kind: 'bookmark'
  url: string
  domain: string
  size: TileSize
  writable: boolean
}
export interface FolderTileView {
  id: string
  kind: 'folder'
  title: string
  size: TileSize
  writable: boolean
  colorIndex: number
  color?: string
  /** First children of the folder in that folder's own layout order, capped per size. */
  preview: PreviewCell[]
}
export type TileView = BookmarkTileView | FolderTileView
export interface GroupView {
  id: string
  title: string
  path: string[]
  rootId: string
  isSystem: boolean
  mutable: boolean
  writable: boolean
  layout: Layout
  tiles: Record<string, TileView>
}
export type Command
  = | { type: 'bookmark.create', parentId: string, title: string, url: string, colorIndex?: number }
    | { type: 'folder.create', parentId: string, title: string }
    | { type: 'node.update', id: string, title: string, url?: string }
    | { type: 'node.move', id: string, parentId: string }
    | { type: 'node.remove', id: string }
    | { type: 'tile.appearance', id: string, patch: Appearance }
    | { type: 'layout.commit', layouts: Record<string, Layout> }
    | { type: 'layout.reset' }
    | { type: 'factory.reset' }
    | { type: 'settings.update', patch: Partial<Settings> }
    | { type: 'undo', id: string, parentId?: string }
export interface Notice { message: string, undoId?: string, tone?: 'success' | 'error' | 'info', actionLabel?: string }
export interface CommandResult { snapshot: Snapshot, notice?: Notice }
export interface BookmarkPort {
  getTree: () => Promise<BookmarkNode[]>
  create: (details: CreateNode) => Promise<BookmarkNode>
  update: (id: string, changes: { title: string, url?: string }) => Promise<BookmarkNode>
  move: (id: string, destination: { parentId: string, index?: number }) => Promise<BookmarkNode>
  remove: (id: string, recursive: boolean) => Promise<void>
  onChange: (listener: () => void) => () => void
}
export interface PersistencePort {
  read: () => Promise<AppData | undefined>
  write: (data: AppData) => Promise<void>
}
export interface Client {
  mode: 'preview' | 'extension'
  snapshot: () => Promise<Snapshot>
  execute: (command: Command) => Promise<CommandResult>
  subscribe: (listener: (snapshot: Snapshot) => void) => () => void
  open: (url: string, disposition: 'tab' | 'window') => Promise<void>
  resetPreview?: () => Promise<Snapshot>
  dispose: () => void
}

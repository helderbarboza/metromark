import type { Layout, LayoutItem } from '@snapgridjs/core'

export type { Compactor, Layout, LayoutItem } from '@snapgridjs/core'

export type TileSize = 'small' | 'medium' | 'wide' | 'large'
export interface MetroFace {
  big?: string | number
  title?: string
  lines?: string[]
  background?: string
}
export interface MetroTileDef {
  title: string
  colorIndex: number
  color?: string
  badge?: string | number
  faces?: MetroFace[]
  period?: number
  url?: string
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
    | 'tokyo-night-dark'
    | 'catppuccin-mocha'
    | 'catppuccin-macchiato'
    | 'catppuccin-frappe'
export interface Settings {
  density: 'comfortable' | 'compact'
  showDomains: boolean
  reducedMotion: boolean
}
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
export interface TileView extends MetroTileDef {
  id: string
  url: string
  domain: string
  size: TileSize
  writable: boolean
}
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
  = | { type: 'bookmark.create', parentId: string, title: string, url: string }
    | { type: 'folder.create', parentId: string, title: string }
    | { type: 'node.update', id: string, title: string, url?: string }
    | { type: 'node.move', id: string, parentId: string }
    | { type: 'node.remove', id: string }
    | { type: 'tile.appearance', id: string, patch: Appearance }
    | { type: 'layout.commit', layouts: Record<string, Layout> }
    | { type: 'layout.reset' }
    | { type: 'settings.update', patch: Partial<Settings> }
    | { type: 'undo', id: string, parentId?: string }
export interface Notice { message: string, undoId?: string, tone?: 'success' | 'error' | 'info' }
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

import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
import type { IconName } from '$lib/icons'
import type { BookmarkNode, Command, FolderTileView, GroupView, TileView } from '$lib/types'
import { BACKGROUND_DEFAULTS } from '$lib/config'
import { getT } from '$lib/locale'

const t = () => getT().menus

export interface MenuItem {
  label: string
  icon: IconName
  action: () => void
  disabled?: boolean
  danger?: boolean
  /** Render a separator before this item. */
  separator?: boolean
}

export interface MenuCallbacks {
  open: (url: string, disposition: 'tab' | 'window') => void
  edit: (spec: DialogSpec) => void
  copy: (id: string) => void
  execute: (command: Command) => Promise<boolean>
  clearSelection: () => void
  focusSearch: () => void
}

export interface GroupMenuInput {
  node: BookmarkNode | undefined
  group: GroupView | undefined
  callbacks: MenuCallbacks
}

export interface CanvasMenuInput {
  groups: GroupView[]
  selectedId: string | null
  /** ID of the group whose grid was right-clicked, if any. */
  contextId: string
  defaultFolder: string
  shaderActive: boolean
  /** Whether an image background with a URL is currently applied. */
  imageActive: boolean
  callbacks: MenuCallbacks
}

export function buildTileMenuItems(tile: TileView | undefined, callbacks: MenuCallbacks): MenuItem[] {
  if (!tile)
    return []
  if (tile.kind === 'folder')
    return buildFolderTileMenuItems(tile, callbacks)
  return [
    { label: t().openInNewTab(), icon: 'openTab', action: () => { void callbacks.open(tile.url, 'tab') } },
    { label: t().openInNewWindow(), icon: 'openWindow', action: () => { void callbacks.open(tile.url, 'window') } },
    { label: t().editBookmark(), icon: 'edit', separator: true, disabled: !tile.writable, action: () => callbacks.edit({ kind: 'bookmark', id: tile.id }) },
    { label: t().moveToFolder(), icon: 'folder', disabled: !tile.writable, action: () => callbacks.edit({ kind: 'move', id: tile.id }) },
    { label: t().customizeTile(), icon: 'customize', action: () => callbacks.edit({ kind: 'appearance', id: tile.id }) },
    { label: t().copyWebsiteAddress(), icon: 'copy', action: () => { void callbacks.copy(tile.id) } },
    { label: t().deleteBookmark(), icon: 'delete', separator: true, danger: true, disabled: !tile.writable, action: () => { void callbacks.execute({ type: 'node.remove', id: tile.id }) } },
  ]
}

export function buildGroupMenuItems(input: GroupMenuInput): MenuItem[] {
  const { node, group, callbacks } = input
  if (!node)
    return []
  return [
    { label: t().addBookmarkHere(), icon: 'addBookmark', disabled: !group?.writable, action: () => callbacks.edit({ kind: 'bookmark', parentId: node.id }) },
    { label: t().createChildFolder(), icon: 'folder', disabled: !group?.writable, action: () => callbacks.edit({ kind: 'folder', parentId: node.id }) },
    { label: t().renameFolder(), icon: 'edit', separator: true, disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'rename', id: node.id }) },
    { label: t().moveFolder(), icon: 'folder', disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'move', id: node.id }) },
    { label: t().deleteFolder(), icon: 'delete', separator: true, danger: true, disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'delete', id: node.id }) },
  ]
}

export function buildCanvasMenuItems(input: CanvasMenuInput): MenuItem[] {
  const { groups, selectedId, contextId, defaultFolder, shaderActive, imageActive, callbacks } = input
  const parentId = groups.find(item => item.id === contextId && item.writable)?.id ?? defaultFolder
  const items: MenuItem[] = [
    { label: t().addBookmark(), icon: 'addBookmark', disabled: parentId.length === 0, action: () => callbacks.edit({ kind: 'bookmark', parentId }) },
    { label: t().createFolderGroup(), icon: 'folder', disabled: parentId.length === 0, action: () => callbacks.edit({ kind: 'folder', parentId }) },
  ]
  if (selectedId !== null) {
    items.push({ label: t().clearSelection(), icon: 'close', separator: true, action: () => callbacks.clearSelection() })
  }
  items.push(
    { label: t().searchBookmarks(), icon: 'searchBookmarks', action: () => callbacks.focusSearch() },
    { label: t().appearanceSettings(), icon: 'settings', separator: true, action: () => callbacks.edit({ kind: 'settings' }) },
  )
  if (shaderActive) {
    items.push({
      label: t().turnOffAnimatedBackground(),
      icon: 'close',
      separator: true,
      action: () => { void callbacks.execute({ type: 'settings.update', patch: { background: { type: 'color', auto: true, color: undefined } } }) },
    })
  }
  if (imageActive) {
    items.push({
      label: t().turnOffBackgroundImage(),
      icon: 'close',
      separator: true,
      action: () => { void callbacks.execute({ type: 'settings.update', patch: { background: { ...BACKGROUND_DEFAULTS.color } } }) },
    })
  }
  return items
}

/** Folder tiles are never deleted; they resize, recolor, move, and rename. */
export function buildFolderTileMenuItems(tile: FolderTileView | undefined, callbacks: MenuCallbacks): MenuItem[] {
  if (!tile)
    return []
  return [
    { label: t().moveToFolder(), icon: 'folder', disabled: !tile.writable, action: () => callbacks.edit({ kind: 'move', id: tile.id }) },
    { label: t().renameFolder(), icon: 'edit', separator: true, disabled: !tile.writable, action: () => callbacks.edit({ kind: 'rename', id: tile.id }) },
    { label: t().customizeTile(), icon: 'customize', separator: true, action: () => callbacks.edit({ kind: 'appearance', id: tile.id }) },
  ]
}

export function buildAppBarMenuItems(tile: TileView | undefined, callbacks: MenuCallbacks): MenuItem[] {
  if (!tile)
    return []
  if (tile.kind === 'folder') {
    return [
      { label: t().customizeTile(), icon: 'customize', action: () => callbacks.edit({ kind: 'appearance', id: tile.id }) },
    ]
  }
  return [
    { label: t().openInNewTab(), icon: 'openTab', action: () => { void callbacks.open(tile.url, 'tab') } },
    { label: t().openInNewWindow(), icon: 'openWindow', action: () => { void callbacks.open(tile.url, 'window') } },
    { label: t().copyWebsiteAddress(), icon: 'copy', action: () => { void callbacks.copy(tile.id) } },
    { label: t().customizeTile(), icon: 'customize', separator: true, action: () => callbacks.edit({ kind: 'appearance', id: tile.id }) },
  ]
}

import type { IconName } from '$lib/icons'
import type { BookmarkNode, GroupView, TileView } from '$lib/types'
import { BACKGROUND_DEFAULTS } from '$lib/config'

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
  edit: (spec: any) => void
  copy: (id: string) => void
  execute: (command: any) => Promise<boolean>
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
  return [
    { label: 'Open in new tab', icon: 'openTab', action: () => { void callbacks.open(tile.url, 'tab') } },
    { label: 'Open in new window', icon: 'openWindow', action: () => { void callbacks.open(tile.url, 'window') } },
    { label: 'Edit bookmark', icon: 'edit', separator: true, disabled: !tile.writable, action: () => callbacks.edit({ kind: 'bookmark', id: tile.id }) },
    { label: 'Move to folder', icon: 'folder', disabled: !tile.writable, action: () => callbacks.edit({ kind: 'move', id: tile.id }) },
    { label: 'Customize tile', icon: 'customize', action: () => callbacks.edit({ kind: 'appearance', id: tile.id }) },
    { label: 'Copy website address', icon: 'copy', action: () => { void callbacks.copy(tile.id) } },
    { label: 'Delete bookmark', icon: 'delete', separator: true, danger: true, disabled: !tile.writable, action: () => { void callbacks.execute({ type: 'node.remove', id: tile.id }) } },
  ]
}

export function buildGroupMenuItems(input: GroupMenuInput): MenuItem[] {
  const { node, group, callbacks } = input
  if (!node)
    return []
  return [
    { label: 'Add bookmark here', icon: 'addBookmark', disabled: !group?.writable, action: () => callbacks.edit({ kind: 'bookmark', parentId: node.id }) },
    { label: 'Create child folder', icon: 'folder', disabled: !group?.writable, action: () => callbacks.edit({ kind: 'folder', parentId: node.id }) },
    { label: 'Rename folder', icon: 'edit', separator: true, disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'rename', id: node.id }) },
    { label: 'Move folder', icon: 'folder', disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'move', id: node.id }) },
    { label: 'Delete folder', icon: 'delete', separator: true, danger: true, disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'delete', id: node.id }) },
  ]
}

export function buildCanvasMenuItems(input: CanvasMenuInput): MenuItem[] {
  const { groups, selectedId, contextId, defaultFolder, shaderActive, imageActive, callbacks } = input
  const parentId = groups.find(item => item.id === contextId && item.writable)?.id ?? defaultFolder
  const items: MenuItem[] = [
    { label: 'Add bookmark', icon: 'addBookmark', disabled: parentId.length === 0, action: () => callbacks.edit({ kind: 'bookmark', parentId }) },
    { label: 'Create folder / group', icon: 'folder', disabled: parentId.length === 0, action: () => callbacks.edit({ kind: 'folder', parentId }) },
  ]
  if (selectedId !== null) {
    items.push({ label: 'Clear selection', icon: 'close', separator: true, action: () => callbacks.clearSelection() })
  }
  items.push(
    { label: 'Search bookmarks', icon: 'searchBookmarks', action: () => callbacks.focusSearch() },
    { label: 'Appearance & settings', icon: 'settings', separator: true, action: () => callbacks.edit({ kind: 'settings' }) },
  )
  if (shaderActive) {
    items.push({
      label: 'Turn off animated background',
      icon: 'close',
      separator: true,
      action: () => { void callbacks.execute({ type: 'settings.update', patch: { background: { type: 'color', auto: true, color: undefined } } }) },
    })
  }
  if (imageActive) {
    items.push({
      label: 'Turn off background image',
      icon: 'close',
      separator: true,
      action: () => { void callbacks.execute({ type: 'settings.update', patch: { background: { ...BACKGROUND_DEFAULTS.color } } }) },
    })
  }
  return items
}

export function buildAppBarMenuItems(tile: TileView | undefined, callbacks: MenuCallbacks): MenuItem[] {
  if (!tile)
    return []
  return [
    { label: 'Open in new tab', icon: 'openTab', action: () => { void callbacks.open(tile.url, 'tab') } },
    { label: 'Open in new window', icon: 'openWindow', action: () => { void callbacks.open(tile.url, 'window') } },
    { label: 'Copy website address', icon: 'copy', action: () => { void callbacks.copy(tile.id) } },
    { label: 'Customize tile', icon: 'customize', separator: true, action: () => callbacks.edit({ kind: 'appearance', id: tile.id }) },
  ]
}

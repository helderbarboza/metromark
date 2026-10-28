import type { MenuItem } from '$lib/components/ContextMenu.svelte'
import type { BookmarkNode, GroupView, TileView } from '$lib/types'

export interface MenuCallbacks {
  open: (url: string, disposition: 'tab' | 'window') => void
  edit: (spec: any) => void
  copy: (id: string) => void
  execute: (command: any) => Promise<boolean>
  clearSelection: () => void
  focusSearch: () => void
}

export interface MenuInputs {
  context: { target: 'tile' | 'group' | 'canvas', id: string, x: number, y: number } | null
  contextTile: TileView | undefined
  node: BookmarkNode | undefined
  group: GroupView | undefined
  groups: GroupView[]
  selectedId: string | null
  defaultFolder: string
  callbacks: MenuCallbacks
}

export function buildMenuItems(input: MenuInputs): MenuItem[] {
  const { context, contextTile, node, group, groups, selectedId, defaultFolder, callbacks } = input
  if (!context)
    return []
  const tile = contextTile
  if (context.target === 'tile' && tile) {
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
  if (context.target === 'group' && node) {
    return [
      { label: 'Add bookmark here', icon: 'addBookmark', disabled: !group?.writable, action: () => callbacks.edit({ kind: 'bookmark', parentId: node.id }) },
      { label: 'Create child folder', icon: 'folder', disabled: !group?.writable, action: () => callbacks.edit({ kind: 'folder', parentId: node.id }) },
      { label: 'Rename folder', icon: 'edit', separator: true, disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'rename', id: node.id }) },
      { label: 'Move folder', icon: 'folder', disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'move', id: node.id }) },
      { label: 'Delete folder', icon: 'delete', separator: true, danger: true, disabled: !group?.mutable, action: () => callbacks.edit({ kind: 'delete', id: node.id }) },
    ]
  }
  const parentId = groups.find(item => item.id === context.id && item.writable)?.id ?? defaultFolder
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

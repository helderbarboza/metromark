import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
import type { Settings } from '$lib/config'
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
  /** When set, render as a CheckboxItem with this checked state instead of a plain item. */
  checked?: boolean
}

export interface MenuCallbacks {
  open: (url: string, disposition: 'tab' | 'window') => void
  edit: (spec: DialogSpec) => void
  copy: (id: string) => void
  execute: (command: Command) => Promise<boolean>
  clearSelection: () => void
}

export interface GroupMenuInput {
  node: BookmarkNode | undefined
  group: GroupView | undefined
  callbacks: MenuCallbacks
}

export interface BoardMenuInput {
  groups: GroupView[]
  selectedId: string | null
  /** ID of the folder whose grid was right-clicked, if any. */
  contextId: string
  defaultFolder: string
  /** The current shader background, when the background type is 'shader'. */
  shaderBackground?: Settings['background'] & { type: 'shader' }
  /** The current YouTube background, when one with a URL is applied. */
  youtubeBackground?: Settings['background'] & { type: 'youtube' }
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
    {
      label: t().openInNewTab(),
      icon: 'openTab',
      action: () => { void callbacks.open(tile.url, 'tab') },
    },
    {
      label: t().openInNewWindow(),
      icon: 'openWindow',
      action: () => { void callbacks.open(tile.url, 'window') },
    },
    {
      label: t().editBookmark(),
      icon: 'edit',
      separator: true,
      disabled: !tile.writable,
      action: () => callbacks.edit({ kind: 'bookmark', id: tile.id }),
    },
    {
      label: t().moveToFolder(),
      icon: 'folderArrowRight',
      disabled: !tile.writable,
      action: () => callbacks.edit({ kind: 'move', id: tile.id }),
    },
    {
      label: t().customizeTile(),
      icon: 'customize',
      action: () => callbacks.edit({ kind: 'appearance', id: tile.id }),
    },
    {
      label: t().copyWebsiteAddress(),
      icon: 'copy',
      action: () => { void callbacks.copy(tile.id) },
    },
    {
      label: t().deleteBookmark(),
      icon: 'delete',
      separator: true,
      danger: true,
      disabled: !tile.writable,
      action: () => { void callbacks.execute({ type: 'node.remove', id: tile.id }) },
    },
  ]
}

export function buildGroupMenuItems(input: GroupMenuInput): MenuItem[] {
  const { node, group, callbacks } = input
  if (!node)
    return []
  return [
    {
      label: t().addBookmarkHere(),
      icon: 'addBookmark',
      disabled: !group?.writable,
      action: () => callbacks.edit({ kind: 'bookmark', parentId: node.id }),
    },
    {
      label: t().createChildFolder(),
      icon: 'folderAdd',
      disabled: !group?.writable,
      action: () => callbacks.edit({ kind: 'folder', parentId: node.id }),
    },
    {
      label: t().renameFolder(),
      icon: 'edit',
      separator: true,
      disabled: !group?.mutable,
      action: () => callbacks.edit({ kind: 'rename', id: node.id }),
    },
    {
      label: t().moveFolder(),
      icon: 'folderArrowRight',
      disabled: !group?.mutable,
      action: () => callbacks.edit({ kind: 'move', id: node.id }),
    },
    {
      label: t().deleteFolder(),
      icon: 'delete',
      separator: true,
      danger: true,
      disabled: !group?.mutable,
      action: () => callbacks.edit({ kind: 'delete', id: node.id }),
    },
  ]
}

export function buildBoardMenuItems(input: BoardMenuInput): MenuItem[] {
  const {
    groups,
    selectedId,
    contextId,
    defaultFolder,
    shaderBackground,
    youtubeBackground,
    imageActive,
    callbacks,
  } = input
  const parentId = groups.find(item => item.id === contextId && item.writable)?.id ?? defaultFolder
  const items: MenuItem[] = [
    {
      label: t().addBookmark(),
      icon: 'addBookmark',
      disabled: parentId.length === 0,
      action: () => callbacks.edit({ kind: 'bookmark', parentId }),
    },
    {
      label: t().createFolderGroup(),
      icon: 'folderAdd',
      disabled: parentId.length === 0,
      action: () => callbacks.edit({ kind: 'folder', parentId }),
    },
  ]
  if (selectedId !== null) {
    items.push({
      label: t().clearSelection(),
      icon: 'close',
      separator: true,
      action: () => callbacks.clearSelection(),
    })
  }
  items.push(
    {
      label: t().appearanceSettings(),
      icon: 'settings',
      separator: true,
      action: () => callbacks.edit({ kind: 'settings' }),
    },
  )
  const animatedBackground = shaderBackground ?? youtubeBackground
  if (animatedBackground) {
    const paused = animatedBackground.paused === true
    items.push({
      label: t().pauseAnimatedBackground(),
      icon: 'pause',
      separator: true,
      checked: paused,
      action: () => {
        void callbacks.execute({
          type: 'settings.update',
          patch: {
            background: { ...animatedBackground, paused: !paused },
          },
        })
      },
    })
  }
  if (imageActive) {
    items.push({
      label: t().turnOffBackgroundImage(),
      icon: 'close',
      separator: true,
      action: () => {
        void callbacks.execute({
          type: 'settings.update',
          patch: {
            background: { ...BACKGROUND_DEFAULTS.color },
          },
        })
      },
    })
  }
  return items
}

/** Folder tiles are never deleted; they resize, recolor, move, and rename. */
function buildFolderTileMenuItems(tile: FolderTileView | undefined, callbacks: MenuCallbacks): MenuItem[] {
  if (!tile)
    return []
  return [
    {
      label: t().moveToFolder(),
      icon: 'folderArrowRight',
      disabled: !tile.writable,
      action: () => callbacks.edit({ kind: 'move', id: tile.id }),
    },
    {
      label: t().renameFolder(),
      icon: 'edit',
      separator: true,
      disabled: !tile.writable,
      action: () => callbacks.edit({ kind: 'rename', id: tile.id }),
    },
    {
      label: t().customizeTile(),
      icon: 'customize',
      separator: true,
      action: () => callbacks.edit({ kind: 'appearance', id: tile.id }),
    },
  ]
}

export function buildAppBarMenuItems(tile: TileView | undefined, callbacks: MenuCallbacks): MenuItem[] {
  if (!tile)
    return []
  if (tile.kind === 'folder') {
    return [
      {
        label: t().customizeTile(),
        icon: 'customize',
        action: () => callbacks.edit({ kind: 'appearance', id: tile.id }),
      },
    ]
  }
  return [
    {
      label: t().openInNewTab(),
      icon: 'openTab',
      action: () => { void callbacks.open(tile.url, 'tab') },
    },
    {
      label: t().openInNewWindow(),
      icon: 'openWindow',
      action: () => { void callbacks.open(tile.url, 'window') },
    },
    {
      label: t().copyWebsiteAddress(),
      icon: 'copy',
      action: () => { void callbacks.copy(tile.id) },
    },
    {
      label: t().customizeTile(),
      icon: 'customize',
      separator: true,
      action: () => callbacks.edit({ kind: 'appearance', id: tile.id }),
    },
  ]
}

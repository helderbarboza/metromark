import type { Appearance, BookmarkNode, Layout, PreviewCell, TileSize } from '$lib/types'
import { isBookmark, isFolder } from '$lib/tree'
import { website } from '$lib/tree-utils'

/**
 * Folder tile shape (Windows-style live preview). The title occupies the last
 * grid row and spans all columns; the remaining rows render the first children
 * in the folder's own layout order.
 */
export const FOLDER_COLUMNS: Record<TileSize, number> = { small: 2, medium: 3, wide: 6, large: 6 }
export const FOLDER_ROWS: Record<TileSize, number> = { small: 2, medium: 3, wide: 3, large: 6 }
export const FOLDER_PREVIEW: Record<TileSize, number> = { small: 4, medium: 6, wide: 12, large: 30 }

/** Children that get laid out in a group: bookmarks and folders, never separators. */
export const isLayoutable = (node: BookmarkNode) => isBookmark(node) || isFolder(node)

/** Order the given nodes into visual layout order (left to right, top to bottom). */
export function orderByLayout(nodes: BookmarkNode[], layout: Layout): BookmarkNode[] {
  const byId = new Map(nodes.map(node => [node.id, node]))
  return layout.flatMap((item) => {
    const node = byId.get(item.i)
    return node ? [node] : []
  })
}

export function toPreviewCell(node: BookmarkNode, appearance: Record<string, Appearance>): PreviewCell {
  if (isFolder(node))
    return { id: node.id, kind: 'folder', title: node.title || 'Untitled folder' }
  const site = website(node.url ?? '')
  const own = appearance[node.id]
  return {
    id: node.id,
    kind: 'bookmark',
    title: node.title || site.domain,
    url: node.url ?? '',
    colorIndex: own?.colorIndex ?? site.colorIndex,
    color: own?.color,
  }
}

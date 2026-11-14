import type { Appearance, BookmarkNode, BookmarkTileView, FolderTileView } from '$lib/types'
import { hashColorIndex, website } from '$lib/tree-utils.js'
import { canModify } from '$lib/tree.js'

export function tileFor(node: BookmarkNode, appearance: Appearance = {}, tree?: BookmarkNode[]): BookmarkTileView {
  const site = website(node.url ?? '')
  return {
    id: node.id,
    kind: 'bookmark',
    title: node.title || site.domain,
    url: node.url ?? '',
    domain: site.domain,
    size: appearance.size ?? 'medium',
    colorIndex: appearance.colorIndex ?? site.colorIndex,
    color: appearance.color,
    writable: tree ? canModify(node, tree) : true,
  }
}

export function tileForFolder(node: BookmarkNode, appearance: Appearance = {}, tree?: BookmarkNode[]): FolderTileView {
  return {
    id: node.id,
    kind: 'folder',
    title: node.title || 'Untitled folder',
    size: appearance.size ?? 'medium',
    writable: tree ? canModify(node, tree) : true,
    // No domain to hash; the folder id keeps the default accent stable across
    // renames and moves.
    colorIndex: appearance.colorIndex ?? hashColorIndex(node.id),
    color: appearance.color,
    // Filled in by the projection, which owns the folder's reconciled layout.
    preview: [],
  }
}

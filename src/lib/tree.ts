import type { BookmarkNode, GroupView, Snapshot } from '$lib/types'
import { reconcileLayout, sizeOf } from '$lib/layout-constants'
import { tileFor } from '$lib/tile'

export const isBookmark = (node: BookmarkNode) => typeof node.url === 'string' && node.type !== 'separator'
export const isFolder = (node: BookmarkNode) => !isBookmark(node) && node.type !== 'separator'
export function flatten(tree: BookmarkNode[]): BookmarkNode[] {
  return tree.flatMap(node => [node, ...flatten(node.children ?? [])])
}
export function indexTree(tree: BookmarkNode[]): Map<string, BookmarkNode> {
  return new Map(flatten(tree).map(node => [node.id, node]))
}
export function pathFor(id: string, nodes: Map<string, BookmarkNode>): string[] {
  const path: string[] = []
  const seen = new Set<string>()
  let node = nodes.get(id)
  while (node && node.parentId != null && !seen.has(node.id)) {
    seen.add(node.id)
    path.unshift(node.title || 'Untitled folder')
    node = nodes.get(node.parentId)
  }
  return path
}
export function formatGroupPath(path: string[]): string {
  return path.length > 1 ? `${path.slice(0, -1).join(' / ')} /` : 'BROWSER ROOT'
}
export function isManaged(node: BookmarkNode, nodes: Map<string, BookmarkNode>): boolean {
  const seen = new Set<string>()
  let cursor: BookmarkNode | undefined = node
  while (cursor && !seen.has(cursor.id)) {
    if (cursor.unmodifiable != null)
      return true
    seen.add(cursor.id)
    cursor = cursor.parentId != null ? nodes.get(cursor.parentId) : undefined
  }
  return false
}
export function isContainer(node: BookmarkNode, tree: BookmarkNode[]): boolean {
  return Boolean(node.folderType) || tree.some(root => root.id === node.parentId)
}
export function canModify(node: BookmarkNode, tree: BookmarkNode[]): boolean {
  return Boolean(node.parentId) && !isContainer(node, tree) && !isManaged(node, indexTree(tree))
}
export function canAddTo(node: BookmarkNode, tree: BookmarkNode[]): boolean {
  return isFolder(node) && Boolean(node.parentId) && !isManaged(node, indexTree(tree))
}
export function projectGroups(snapshot: Snapshot): GroupView[] {
  const nodes = indexTree(snapshot.tree)
  const result: GroupView[] = []
  const walk = (node: BookmarkNode, path: string[], rootId: string) => {
    if (!isFolder(node))
      return
    const currentPath = [...path, node.title || 'Untitled folder']
    const links = (node.children ?? []).filter(isBookmark)
    const layout = reconcileLayout(links, snapshot.layouts[node.id], snapshot.appearance)
    const tiles = Object.fromEntries(links.map((bookmark) => {
      const tile = tileFor(bookmark, snapshot.appearance[bookmark.id])
      tile.writable = !isManaged(bookmark, nodes)
      const item = layout.find(entry => entry.i === bookmark.id)
      tile.size = item ? sizeOf(item) : tile.size
      return [bookmark.id, tile]
    }))
    result.push({
      id: node.id,
      title: node.title || 'Untitled folder',
      path: currentPath,
      rootId,
      isSystem: isContainer(node, snapshot.tree),
      mutable: canModify(node, snapshot.tree),
      writable: !isManaged(node, nodes),
      layout,
      tiles,
    })
    for (const child of node.children ?? []) {
      if (isFolder(child))
        walk(child, currentPath, rootId)
    }
  }
  for (const root of snapshot.tree) {
    for (const container of root.children ?? []) {
      if (isFolder(container))
        walk(container, [], container.id)
    }
    const links = (root.children ?? []).filter(isBookmark)
    if (links.length) {
      result.unshift(
        {
          id: root.id,
          title: '',
          path: [],
          rootId: root.id,
          isSystem: true,
          mutable: false,
          writable: false,
          layout: reconcileLayout(links, snapshot.layouts[root.id], snapshot.appearance),
          tiles: Object.fromEntries(links.map(node => [node.id, tileFor(node, snapshot.appearance[node.id], snapshot.tree)])),
        },
      )
    }
  }
  return result
}
export const countBookmarks = (node: BookmarkNode) => flatten([node]).filter(isBookmark).length

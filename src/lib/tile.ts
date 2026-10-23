import type { Appearance, BookmarkNode, TileView } from './types'
import { website } from './tree-utils.js'
import { canModify } from './tree.js'

export function tileFor(node: BookmarkNode, appearance: Appearance = {}, tree?: BookmarkNode[]): TileView {
  const site = website(node.url ?? '')
  return {
    id: node.id,
    title: node.title || site.domain,
    url: node.url ?? '',
    domain: site.domain,
    size: appearance.size ?? 'medium',
    colorIndex: appearance.colorIndex ?? site.colorIndex,
    color: appearance.color,
    writable: tree ? canModify(node, tree) : true,
  }
}

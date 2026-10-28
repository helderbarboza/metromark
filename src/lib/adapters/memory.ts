import type { AppData, BookmarkNode, BookmarkPort, CreateNode, PersistencePort } from '$lib/types'
import { flatten } from '$lib/tree'

export function normalizeTree(tree: BookmarkNode[]): BookmarkNode[] {
  const walk = (nodes: BookmarkNode[], parentId?: string): BookmarkNode[] => nodes.map((node, index) => ({
    ...node,
    parentId,
    index,
    ...(node.children ? { children: walk(node.children, node.id) } : {}),
  }))
  return walk(tree)
}

/** The same port is used by isolated stories and unit tests, never the browser's bookmarks. */
export class MemoryBookmarks implements BookmarkPort {
  private tree: BookmarkNode[]
  private listeners = new Set<() => void>()
  private serial = 0
  constructor(tree: BookmarkNode[], private persist?: (tree: BookmarkNode[]) => void) { this.tree = normalizeTree(structuredClone(tree)) }
  async getTree() { return structuredClone(this.tree) }
  private node(id: string) {
    const node = flatten(this.tree).find(node => node.id === id)
    if (!node)
      throw new Error('Bookmark not found.')
    return node
  }

  private changed() {
    this.tree = normalizeTree(this.tree)
    this.persist?.(structuredClone(this.tree))
    for (const listener of this.listeners) listener()
  }

  replace(tree: BookmarkNode[]) {
    this.tree = normalizeTree(structuredClone(tree))
    for (const listener of this.listeners) listener()
  }

  async create(details: CreateNode) {
    const parent = this.node(details.parentId)
    if (!parent.children)
      throw new Error('The destination is not a folder.')
    const node: BookmarkNode = { id: `new-${Date.now().toString(36)}-${++this.serial}-${crypto.randomUUID().slice(0, 6)}`, title: details.title ?? '', parentId: parent.id, ...(details.url != null ? { url: details.url } : { children: [] }), ...(details.type != null ? { type: details.type } : {}) }
    parent.children.splice(details.index ?? parent.children.length, 0, node)
    this.changed()
    return structuredClone(this.node(node.id))
  }

  async update(id: string, changes: { title: string, url?: string }) {
    const node = this.node(id)
    node.title = changes.title
    if (changes.url !== undefined)
      node.url = changes.url
    this.changed()
    return structuredClone(node)
  }

  async move(id: string, destination: { parentId: string, index?: number }) {
    const node = this.node(id)
    const source = this.node(node.parentId!)
    const target = this.node(destination.parentId)
    if (!target.children)
      throw new Error('The destination is not a folder.')
    source.children = source.children!.filter(child => child.id !== id)
    target.children.splice(destination.index ?? target.children.length, 0, node)
    this.changed()
    return structuredClone(this.node(id))
  }

  async remove(id: string, recursive: boolean) {
    const node = this.node(id)
    if (!recursive && (node.children?.length ?? 0) > 0)
      throw new Error('Folder is not empty.')
    const parent = this.node(node.parentId!)
    parent.children = parent.children!.filter(child => child.id !== id)
    this.changed()
  }

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
export class MemoryPersistence implements PersistencePort {
  constructor(public data?: AppData) {}
  async read() { return this.data ? structuredClone(this.data) : undefined }
  async write(data: AppData) { this.data = structuredClone(data) }
}

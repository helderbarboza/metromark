import type { BookmarkNode, GroupView, Snapshot } from '$lib/types'
import { flatten, isFolder, projectGroups } from '$lib/tree'

export interface DialogSpec {
  kind:
    | 'bookmark'
    | 'folder'
    | 'rename'
    | 'move'
    | 'delete'
    | 'appearance'
    | 'restore'
    | 'copy'
  id?: string
  parentId?: string
  undoId?: string
}

export function dialogTitle(spec: DialogSpec, node?: BookmarkNode): string {
  switch (spec.kind) {
    case 'bookmark':
      return node ? 'Edit bookmark' : 'A new favorite'
    case 'folder':
      return 'Make a little room'
    case 'rename':
      return 'Rename folder'
    case 'move':
      return 'Find a new home'
    case 'delete':
      return 'Delete this folder?'
    case 'appearance':
      return 'Make it your own'
    case 'restore':
      return 'Restore to a folder'
    case 'copy':
      return 'Copy website address'
  }
}

export function dialogEyebrow(spec: DialogSpec): string {
  if (spec.kind === 'delete')
    return 'DESTRUCTIVE ACTION'
  return 'YOUR BOOKMARKS'
}

export function writableGroups(snapshot: Snapshot): GroupView[] {
  return projectGroups(snapshot).filter(group => group.writable)
}

export function destinationGroups(snapshot: Snapshot, node?: BookmarkNode): GroupView[] {
  const excluded = node && isFolder(node)
    ? new Set(flatten([node]).map(child => child.id))
    : undefined
  return writableGroups(snapshot).filter(group => !excluded?.has(group.id))
}

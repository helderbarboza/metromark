import type { BookmarkNode, GroupView, Snapshot } from '$lib/types'
import { getT } from '$lib/locale'
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
    | 'settings'
  id?: string
  parentId?: string
  undoId?: string
}

export function dialogTitle(spec: DialogSpec, node?: BookmarkNode): string {
  const t = getT().dialogs
  switch (spec.kind) {
    case 'bookmark':
      return node ? t.editBookmark() : t.aNewFavorite()
    case 'folder':
      return t.makeALittleRoom()
    case 'rename':
      return t.renameFolder()
    case 'move':
      return t.findNewHome()
    case 'delete':
      return t.deleteThisFolder()
    case 'appearance':
      return t.makeItYourOwn()
    case 'restore':
      return t.restoreToFolder()
    case 'copy':
      return t.copyWebsiteAddress()
    case 'settings':
      return t.settings()
  }
}

export function dialogEyebrow(spec: DialogSpec): string {
  const t = getT().dialogs
  if (spec.kind === 'delete')
    return t.destructiveAction()
  return t.yourBookmarks()
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

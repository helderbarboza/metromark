import type {
  AppData,
  Appearance,
  BookmarkNode,
  BookmarkPort,
  Command,
  CommandResult,
  DeletedBackup,
  Layout,
  Notice,
  PersistencePort,
  Settings,
  Snapshot,
  UndoRecord,
} from '$lib/types'
import { normalizeImageBackgroundSettings, validateBackgroundUrl } from '$lib/background-image'
import { APPEARANCE_DEFAULTS } from '$lib/config'
import { isLayoutable } from '$lib/folder-preview'
import { allowsLargeSize, effectiveTileSize, freePosition, GRID_VIEW_IDS, gridViewDef, isGridView, reconcileLayout, SIZES, validateLayout } from '$lib/layout'
import { applyLocale, getT } from '$lib/locale'
import { canAddTo, canModify, flatten, indexTree, isBookmark, isFolder, projectGroups } from '$lib/tree'
import { parseYouTubeBackgroundTarget } from '$lib/youtube'

export const UNDO_TTL = 30_000

export function emptyData(settings: Settings): AppData {
  return {
    schema: 1,
    appearance: {},
    layouts: {},
    dockLayouts: {},
    settings: { ...settings },
    undos: [],
  }
}

/** True when a stored layout item fits the given row count. */
function fitsRows(item: { y: number, h: number }, rows: number): boolean {
  return item.y >= 0 && item.y + item.h <= rows
}

/** Validate a theme swatch index. Custom colors stay outside this range. */
function checkedColorIndex(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 7)
    throw new Error(getT().errors.colorIndexRange())
  return value
}

/** Validate a custom hex color. An empty string clears the custom color. */
function checkedColor(value: string): string {
  if (value !== '' && !/^#[0-9a-f]{6}$/i.test(value))
    throw new Error(getT().errors.hexColor())
  return value
}

/** A single writer for bookmark commands and extension metadata. No UI or DOM dependency. */
export class BookmarkCoordinator {
  private data: AppData
  private tree: BookmarkNode[] = []
  private revision = 0
  private tail: Promise<unknown> = Promise.resolve()
  private listeners = new Set<() => void>()
  private unsubscribe: () => void
  private timer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  readonly ready: Promise<void>

  constructor(
    private bookmarks: BookmarkPort,
    private persistence: PersistencePort,
    private readonly settings: Settings,
    readonly mode: 'preview' | 'extension' = 'extension',
  ) {
    this.data = emptyData(settings)
    // Registration is synchronous, before the first asynchronous read.
    this.unsubscribe = bookmarks.onChange(() => {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        void this.exclusive(async () => {
          if (this.disposed)
            return
          await this.refresh()
          if (this.recoverPrepared())
            await this.save()
          this.publish()
        }).catch((error: unknown) => console.error('Bookmark refresh failed:', error))
      }, 25)
    })
    this.ready = this.exclusive(async () => {
      const stored = await persistence.read()
      if (stored?.schema === 1) {
        this.data = {
          ...emptyData(this.settings),
          ...stored,
          settings: normalizeImageBackgroundSettings({
            ...this.settings,
            ...stored.settings,
          }),
        }
      }
      await this.refresh()
      applyLocale(this.data.settings.language, { persist: false })
      if (this.recoverPrepared())
        await this.save()
    })
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation)
    this.tail = next.catch(() => undefined)
    return next
  }

  private async refresh() {
    this.tree = await this.bookmarks.getTree()
    this.revision++
  }

  private async save() { await this.persistence.write(structuredClone(this.data)) }
  private publish() { for (const listener of this.listeners) listener() }
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.timer)
    this.unsubscribe()
    this.listeners.clear()
  }

  private node(id: string): BookmarkNode {
    if (typeof id !== 'string')
      throw new TypeError(getT().errors.invalidIdentifier())
    const node = indexTree(this.tree).get(id)
    if (!node)
      throw new Error(getT().errors.noLongerExists())
    return node
  }

  private editable(id: string) {
    const node = this.node(id)
    if (!canModify(node, this.tree))
      throw new Error(getT().errors.readOnly())
    return node
  }

  private destination(id: string) {
    const node = this.node(id)
    if (!canAddTo(node, this.tree))
      throw new Error(getT().errors.protectedDestination())
    return node
  }

  private title(value: string): string {
    if (typeof value !== 'string' || !value.trim())
      throw new Error(getT().errors.giveName())
    if (value.length > 2048)
      throw new Error(getT().errors.nameTooLong())
    return value.trim()
  }

  private checkMove(node: BookmarkNode, parentId: string) {
    this.destination(parentId)
    if (flatten([node]).some(child => child.id === parentId))
      throw new Error(getT().errors.cannotMoveIntoSelf())
  }

  /** All registered grid views, in definition order. */
  private viewDefs() {
    return GRID_VIEW_IDS.map(gridViewDef)
  }

  /** Defs of every view other than the active one. */
  private otherDefs() {
    return this.viewDefs().filter(def => def.id !== gridViewDef(this.data.settings.gridView).id)
  }

  /** The def of the active view. */
  private activeDef() {
    return gridViewDef(this.data.settings.gridView)
  }

  /** Which layouts map the active view uses. */
  private activeKey(): 'layouts' | 'dockLayouts' {
    return this.activeDef().layoutsKey
  }

  private activeRows(): number {
    return this.activeDef().rows
  }

  /** Map used by the other view; kept in sync by the move/commit paths. */
  private inactiveKey(): 'layouts' | 'dockLayouts' {
    return this.otherDefs()[0]?.layoutsKey ?? 'dockLayouts'
  }

  private inactiveRows(): number {
    return this.otherDefs()[0]?.rows ?? this.activeRows()
  }

  private currentSnapshot(): Snapshot {
    const ids = indexTree(this.tree)
    return structuredClone({
      tree: this.tree,
      appearance: this.data.appearance,
      layouts: this.data[this.activeKey()],
      settings: this.data.settings,
      revision: this.revision,
      mode: this.mode,
      undos: this.data.undos.filter(undo => undo.phase === 'committed' && undo.expiresAt > Date.now()).map(undo => ({
        id: undo.id,
        label: undo.label,
        expiresAt: undo.expiresAt,
        needsDestination: undo.payload.kind === 'delete' && !ids.has(undo.payload.backup.parentId),
      })),
    })
  }

  async snapshot(): Promise<Snapshot> {
    return this.exclusive(async () => {
      await this.refresh()
      if (this.recoverPrepared())
        await this.save()
      return this.currentSnapshot()
    })
  }

  private recoverPrepared(): boolean {
    const nodes = indexTree(this.tree)
    const previous = JSON.stringify(this.data.undos)
    this.data.undos = this.data.undos.filter(undo => undo.expiresAt > Date.now()).filter((undo) => {
      if (undo.phase !== 'prepared')
        return true
      const payload = undo.payload
      let committed = false
      if (payload.kind === 'delete')
        committed = !nodes.has(payload.backup.node.id)
      if (payload.kind === 'move')
        committed = nodes.get(payload.nodeId)?.parentId === payload.expectedParent
      if (payload.kind === 'update') {
        const node = nodes.get(payload.nodeId)
        committed = node?.title === payload.after.title && node?.url === payload.after.url
      }
      if (committed)
        undo.phase = 'committed'
      return committed
    })
    return previous !== JSON.stringify(this.data.undos)
  }

  private async prepareUndo(label: string, payload: UndoRecord['payload']) {
    const undo: UndoRecord = {
      id: crypto.randomUUID(),
      label,
      payload,
      phase: 'prepared',
      expiresAt: Date.now() + UNDO_TTL,
    }
    this.data.undos = this.data.undos.filter(record => record.expiresAt > Date.now()).slice(-19)
    this.data.undos.push(undo)
    // The destructive API call is not allowed to proceed if this write fails.
    try {
      await this.save()
    }
    catch (error) {
      this.data.undos = this.data.undos.filter(record => record.id !== undo.id)
      throw error
    }
    return undo
  }

  private commitUndo(undo: UndoRecord) {
    undo.phase = 'committed'
    undo.expiresAt = Date.now() + UNDO_TTL
  }

  async execute(command: Command): Promise<CommandResult> {
    return this.exclusive(async () => {
      if (typeof command?.type !== 'string')
        throw new TypeError(getT().errors.invalidCommand())
      // Settings changes never touch the bookmark tree. Skip the tree reads so
      // high-frequency updates (slider drags) stay cheap.
      const settingsOnly = command.type === 'settings.update'
      if (!settingsOnly) {
        await this.refresh()
        this.recoverPrepared()
      }
      try {
        const notice = await this.perform(command)
        if (!settingsOnly)
          await this.refresh()
        await this.save()
        this.publish()
        return {
          snapshot: this.currentSnapshot(),
          notice,
        }
      }
      catch (error) {
        if (!settingsOnly) {
          await this.refresh()
          if (this.recoverPrepared())
            await this.save().catch(() => undefined)
        }
        this.publish()
        throw error
      }
    })
  }

  private async perform(command: Command): Promise<Notice | undefined> {
    switch (command.type) {
      case 'bookmark.create': {
        this.destination(command.parentId)
        const appearance: Appearance = {}
        if (command.colorIndex !== undefined)
          appearance.colorIndex = checkedColorIndex(command.colorIndex)
        if (command.color !== undefined)
          appearance.color = checkedColor(command.color)
        const created = await this.bookmarks.create({
          parentId: command.parentId,
          title: this.title(command.title),
          url: command.url.trim(),
        })
        if (Object.keys(appearance).length > 0) {
          this.data.appearance[created.id] = {
            ...this.data.appearance[created.id],
            ...appearance,
          }
        }
        return {
          message: getT().notices.bookmarkAdded(),
        }
      }
      case 'folder.create': {
        this.destination(command.parentId)
        const appearance: Appearance = {}
        if (command.colorIndex !== undefined)
          appearance.colorIndex = checkedColorIndex(command.colorIndex)
        if (command.color !== undefined)
          appearance.color = checkedColor(command.color)
        const created = await this.bookmarks.create({
          parentId: command.parentId,
          title: this.title(command.title),
        })
        if (Object.keys(appearance).length > 0) {
          this.data.appearance[created.id] = {
            ...this.data.appearance[created.id],
            ...appearance,
          }
        }
        return {
          message: getT().notices.folderCreated(),
        }
      }
      case 'node.update': {
        const node = this.editable(command.id)
        const after = {
          title: this.title(command.title),
          url: node.url,
        }
        if (command.url !== undefined) {
          if (!isBookmark(node))
            throw new Error(getT().errors.foldersNoUrl())
          after.url = command.url.trim()
        }
        if (after.title === node.title && after.url === node.url)
          return undefined
        const undo = await this.prepareUndo(getT().undoLabels.changesSaved(), {
          kind: 'update',
          nodeId: node.id,
          before: { title: node.title, url: node.url },
          after,
        })
        await this.bookmarks.update(node.id, after)
        this.commitUndo(undo)
        return {
          message: getT().notices.changesSaved(),
          undoId: undo.id,
        }
      }
      case 'node.move': {
        const node = this.editable(command.id)
        this.checkMove(node, command.parentId)
        if (node.parentId === command.parentId)
          return undefined
        const groups = projectGroups(this.currentSnapshot())
        const source = groups.find(group => group.id === node.parentId)
        const target = groups.find(group => group.id === command.parentId)
        const position = source?.layout.find(item => item.i === node.id)
        const undo = await this.prepareUndo(isFolder(node)
          ? getT().undoLabels.folderMoved()
          : getT().undoLabels.bookmarkMoved(), {
          kind: 'move',
          nodeId: node.id,
          oldParent: node.parentId!,
          oldIndex: node.index ?? 0,
          expectedParent: command.parentId,
          position,
        })
        await this.bookmarks.move(node.id, { parentId: command.parentId })
        // Folder tiles keep their size and position through a Move-to-folder
        // as part of the same layout sync.
        if ((isBookmark(node) || isFolder(node)) && source && target && position) {
          const key = this.activeKey()
          this.data[key] = {
            ...this.data[key],
            [source.id]: source.layout.filter(item => item.i !== node.id),
            [target.id]: [
              ...target.layout,
              freePosition(target.layout, position, this.activeRows()),
            ],
          }
          // The other view self-heals on projection: the moved tile drops out
          // of the old group and lands at the next free slot in the new one.
          const other = this.inactiveKey()
          const otherRows = this.inactiveRows()
          const otherMap = this.data[other]
          const otherSource = (otherMap[source.id] ?? []).filter(item => item.i !== node.id)
          const otherDest = (otherMap[target.id] ?? []).filter(item => item.i !== node.id)
          const [w, h] = SIZES[effectiveTileSize(this.data.appearance[node.id]?.size ?? APPEARANCE_DEFAULTS.size, otherRows)]
          this.data[other] = {
            ...otherMap,
            [source.id]: otherSource,
            [target.id]: [
              ...otherDest,
              freePosition(otherDest, { i: node.id, x: 0, y: 0, w, h }, otherRows),
            ],
          }
        }
        this.commitUndo(undo)
        return {
          message: isFolder(node)
            ? getT().notices.folderMoved()
            : getT().notices.bookmarkMoved(),
          undoId: undo.id,
        }
      }
      case 'node.remove': {
        const node = this.editable(command.id)
        if (flatten([node]).some(child => !canModify(child, this.tree)))
          throw new Error(getT().errors.managedItems())
        const ids = new Set(flatten([node]).map(child => child.id))
        const siblings = this.node(node.parentId!).children ?? []
        const index = siblings.findIndex(sibling => sibling.id === node.id)
        const groups = projectGroups(this.currentSnapshot())
        const backup: DeletedBackup = {
          node: structuredClone(node),
          parentId: node.parentId!,
          index: Math.max(0, index),
          precedingId: siblings[index - 1]?.id,
          followingId: siblings[index + 1]?.id,
          appearance: Object.fromEntries(Object.entries(this.data.appearance).filter(([id]) => ids.has(id))),
          layouts: Object.fromEntries(Object.entries(this.data.layouts).filter(([id]) => ids.has(id))),
          dockLayouts: Object.fromEntries(Object.entries(this.data.dockLayouts).filter(([id]) => ids.has(id))),
          position: groups.find(group => group.id === node.parentId)?.layout.find(item => item.i === node.id),
        }
        const label = isFolder(node)
          ? getT().undoLabels.folderDeleted({ title: node.title })
          : getT().undoLabels.bookmarkDeleted({ title: node.title })
        const undo = await this.prepareUndo(label, { kind: 'delete', backup })
        await this.bookmarks.remove(node.id, isFolder(node))
        for (const id of ids) {
          delete this.data.appearance[id]
          for (const def of this.viewDefs())
            delete this.data[def.layoutsKey][id]
        }
        for (const def of this.viewDefs()) {
          const map = { ...this.data[def.layoutsKey] }
          for (const [groupId, layout] of Object.entries(map)) {
            map[groupId] = layout.filter(item => !ids.has(item.i))
          }
          this.data[def.layoutsKey] = map
        }
        this.commitUndo(undo)
        return { message: label, undoId: undo.id }
      }
      case 'tile.appearance': {
        const node = this.node(command.id)
        if (!isBookmark(node) && !isFolder(node))
          throw new Error(getT().errors.onlyTiles())
        const patch: Appearance = {}
        if (command.patch.size !== undefined) {
          if (!(command.patch.size in SIZES))
            throw new Error(getT().errors.supportedSize())
          if (!allowsLargeSize(this.activeRows()) && command.patch.size === 'large')
            throw new Error(getT().errors.invalidTileSize())
          patch.size = command.patch.size
        }
        if (command.patch.colorIndex !== undefined) {
          patch.colorIndex = checkedColorIndex(command.patch.colorIndex)
        }
        if (command.patch.color !== undefined) {
          patch.color = checkedColor(command.patch.color)
        }
        const parentId = node.parentId
        const existing = { ...this.data.appearance[node.id] }
        this.data.appearance[node.id] = {
          ...existing,
          ...patch,
        }
        if (parentId !== undefined) {
          const children = (this.node(parentId).children ?? []).filter(isLayoutable)
          for (const def of this.viewDefs()) {
            this.data[def.layoutsKey][parentId] = reconcileLayout(
              children,
              this.data[def.layoutsKey][parentId],
              this.data.appearance,
              def.rows,
            )
          }
        }
        return undefined
      }
      case 'layout.commit': {
        if (command.layouts == null || typeof command.layouts !== 'object')
          throw new Error(getT().errors.invalidGroupLayouts())
        const nodes = indexTree(this.tree)
        const rows = this.activeRows()
        const layouts: Record<string, Layout> = {}
        const ownership = new Map<string, string>()
        const moves: { node: BookmarkNode, destination: string }[] = []
        for (const [folderId, raw] of Object.entries(command.layouts)) {
          if (!isFolder(this.node(folderId)))
            throw new Error(getT().errors.groupMustBeFolder())
          const layout = validateLayout(raw, rows)
          for (const item of layout) {
            const node = nodes.get(item.i)
            if (!node || (!isBookmark(node) && !isFolder(node)))
              throw new Error(getT().errors.tileChanged())
            if (ownership.has(node.id))
              throw new Error(getT().errors.tileTwoGroups())
            ownership.set(node.id, folderId)
            if (node.parentId !== folderId) {
              this.editable(node.id)
              this.checkMove(node, folderId)
              moves.push({ node, destination: folderId })
            }
          }
          layouts[folderId] = layout
        }
        if (moves.length > 1)
          throw new Error(getT().errors.moveOneAtATime())
        let undo: UndoRecord | undefined
        if (moves.length > 0) {
          const { node, destination } = moves[0]
          const folder = isFolder(node)
          const position = projectGroups(this.currentSnapshot()).find(group => group.id === node.parentId)?.layout.find(item => item.i === node.id)
          undo = await this.prepareUndo(folder
            ? getT().undoLabels.folderMoved()
            : getT().undoLabels.bookmarkMoved(), {
            kind: 'move',
            nodeId: node.id,
            oldParent: node.parentId!,
            oldIndex: node.index ?? 0,
            expectedParent: destination,
            position,
          })
          await this.bookmarks.move(node.id, { parentId: destination })
          this.commitUndo(undo)
        }
        Object.assign(this.data[this.activeKey()], layouts)
        if (moves.length === 1) {
          // Mirror the relocation into the other view; its coordinates can't be
          // reused, so drop the tile at the destination's next free slot.
          const { node, destination } = moves[0]
          const other = this.inactiveKey()
          const otherRows = this.inactiveRows()
          const otherMap = { ...this.data[other] }
          for (const [groupId, layout] of Object.entries(otherMap))
            otherMap[groupId] = layout.filter(item => item.i !== node.id)
          const [w, h] = SIZES[effectiveTileSize(this.data.appearance[node.id]?.size ?? APPEARANCE_DEFAULTS.size, otherRows)]
          const dest = otherMap[destination] ?? []
          otherMap[destination] = [
            ...dest,
            freePosition(dest, { i: node.id, x: 0, y: 0, w, h }, otherRows),
          ]
          this.data[other] = otherMap
        }
        return undo
          ? {
              message: isFolder(moves[0].node)
                ? getT().notices.folderMovedNewGroup()
                : getT().notices.bookmarkMovedNewFolder(),
              undoId: undo.id,
            }
          : undefined
      }
      case 'settings.update': {
        const patch = command.patch
        if (patch.density !== undefined && !['comfortable', 'compact'].includes(patch.density))
          throw new Error(getT().errors.invalidDensity())
        if (patch.gridView !== undefined && !isGridView(patch.gridView))
          throw new Error(getT().errors.invalidGridView())
        if (patch.showDomains !== undefined && typeof patch.showDomains !== 'boolean')
          throw new Error(getT().errors.invalidDomainSetting())
        if (patch.originalFavicons !== undefined && typeof patch.originalFavicons !== 'boolean')
          throw new Error(getT().errors.invalidFaviconSetting())
        if (patch.reducedMotion !== undefined && typeof patch.reducedMotion !== 'boolean')
          throw new Error(getT().errors.invalidMotionSetting())
        if (patch.language !== undefined && !['auto', 'en', 'de', 'fr', 'es', 'pt'].includes(patch.language))
          throw new Error(getT().errors.invalidLanguage())
        if (patch.background !== undefined) {
          const background = patch.background
          if (background.type === 'color') {
            if (background.auto !== undefined && typeof background.auto !== 'boolean')
              throw new Error(getT().errors.invalidBackgroundMode())
            if (background.color !== undefined && background.color !== '' && !/^#[0-9a-f]{6}$/i.test(background.color))
              throw new Error(getT().errors.hexColor())
          }
          else if (background.type === 'image') {
            if (typeof background.url !== 'string')
              throw new TypeError(getT().errors.invalidBackgroundImage())
            try {
              validateBackgroundUrl(background.url)
            }
            catch (error) {
              throw new Error(error instanceof Error
                ? error.message
                : getT().errors.invalidBackgroundImage())
            }
            if (background.fit !== undefined && !['cover', 'contain', 'fill'].includes(background.fit))
              throw new Error(getT().errors.invalidImageFit())
            if (background.opacity !== undefined && (typeof background.opacity !== 'number' || !Number.isFinite(background.opacity) || background.opacity < 0 || background.opacity > 1))
              throw new Error(getT().errors.invalidImageOpacity())
            if (background.parallax !== undefined && typeof background.parallax !== 'boolean')
              throw new Error(getT().errors.invalidParallax())
            if (background.parallaxZoom !== undefined && (!Number.isFinite(background.parallaxZoom) || background.parallaxZoom < 1 || background.parallaxZoom > 4))
              throw new Error(getT().errors.invalidParallaxZoom())
            if (background.auto !== undefined && typeof background.auto !== 'boolean')
              throw new Error(getT().errors.invalidBackgroundMode())
            if (background.color !== undefined && background.color !== '' && !/^#[0-9a-f]{6}$/i.test(background.color))
              throw new Error(getT().errors.hexColor())
          }
          else if (background.type === 'youtube') {
            if (typeof background.url !== 'string')
              throw new TypeError(getT().errors.invalidYoutubeUrl())
            if (background.url.trim() !== '' && parseYouTubeBackgroundTarget(background.url) === null)
              throw new Error(getT().errors.invalidYoutubeUrl())
            if (background.fit !== undefined && !['cover', 'contain', 'fill'].includes(background.fit))
              throw new Error(getT().errors.invalidYoutubeFit())
            if (background.opacity !== undefined && (typeof background.opacity !== 'number' || !Number.isFinite(background.opacity) || background.opacity < 0 || background.opacity > 1))
              throw new Error(getT().errors.invalidYoutubeOpacity())
            if (background.parallax !== undefined && typeof background.parallax !== 'boolean')
              throw new Error(getT().errors.invalidParallax())
            if (background.parallaxZoom !== undefined && (!Number.isFinite(background.parallaxZoom) || background.parallaxZoom < 1 || background.parallaxZoom > 4))
              throw new Error(getT().errors.invalidParallaxZoom())
            if (background.playbackRate !== undefined && ![0.25, 0.5, 1, 1.5, 2].includes(background.playbackRate))
              throw new Error(getT().errors.invalidYoutubePlaybackRate())
            if (background.playlistOrder !== undefined && !['shuffle', 'sequential'].includes(background.playlistOrder))
              throw new Error(getT().errors.invalidPlaylistOrder())
            if (background.paused !== undefined && typeof background.paused !== 'boolean')
              throw new Error(getT().errors.invalidBackgroundSetting())
            if (background.auto !== undefined && typeof background.auto !== 'boolean')
              throw new Error(getT().errors.invalidBackgroundMode())
            if (background.color !== undefined && background.color !== '' && !/^#[0-9a-f]{6}$/i.test(background.color))
              throw new Error(getT().errors.hexColor())
          }
          else if (background.type === 'shader') {
            if (background.shaderId !== undefined && typeof background.shaderId !== 'string')
              throw new Error(getT().errors.invalidBackgroundSetting())
            if (background.speed !== undefined && (typeof background.speed !== 'number' || !Number.isFinite(background.speed) || background.speed < 0))
              throw new Error(getT().errors.invalidShaderSpeed())
            if (background.targetFps !== undefined && (typeof background.targetFps !== 'number' || !Number.isFinite(background.targetFps)))
              throw new Error(getT().errors.invalidShaderFps())
            if (background.opacity !== undefined && (typeof background.opacity !== 'number' || !Number.isFinite(background.opacity) || background.opacity < 0 || background.opacity > 1))
              throw new Error(getT().errors.invalidShaderOpacity())
            if (background.mouseInteraction !== undefined && typeof background.mouseInteraction !== 'boolean')
              throw new Error(getT().errors.invalidShaderMouse())
            if (background.renderScale !== undefined && (typeof background.renderScale !== 'number' || !Number.isFinite(background.renderScale) || background.renderScale < 0.25 || background.renderScale > 1.5))
              throw new Error(getT().errors.invalidShaderRenderScale())
            if (background.quality !== undefined && (typeof background.quality !== 'string' || !['motion', 'detail'].includes(background.quality)))
              throw new Error(getT().errors.invalidShaderQuality())
            if (background.paused !== undefined && typeof background.paused !== 'boolean')
              throw new Error(getT().errors.invalidBackgroundSetting())
            if (background.auto !== undefined && typeof background.auto !== 'boolean')
              throw new Error(getT().errors.invalidBackgroundMode())
            if (background.color !== undefined && background.color !== '' && !/^#[0-9a-f]{6}$/i.test(background.color))
              throw new Error(getT().errors.hexColor())
          }
        }
        this.data.settings = {
          ...this.data.settings,
          ...patch,
        }
        if (patch.language !== undefined)
          applyLocale(this.data.settings.language, { persist: false })
        return undefined
      }
      case 'layout.reset': {
        const undo: UndoRecord = {
          id: crypto.randomUUID(),
          label: getT().undoLabels.layoutsReset(),
          phase: 'committed',
          expiresAt: Date.now() + UNDO_TTL,
          payload: {
            kind: 'layouts',
            before: structuredClone(this.data.layouts),
            beforeDock: structuredClone(this.data.dockLayouts),
          },
        }
        this.data.undos.push(undo)
        this.data.layouts = {}
        this.data.dockLayouts = {}
        return {
          message: getT().notices.layoutsReset(),
          undoId: undo.id,
        }
      }
      case 'factory.reset': {
        // Restore MetroMark presentation data only. Native bookmarks stay untouched.
        this.data = emptyData(this.settings)
        applyLocale(this.data.settings.language, { persist: false })
        return {
          message: getT().notices.factoryResetDone(),
        }
      }
      case 'undo': return this.undo(command.id, command.parentId)
      default: throw new Error(getT().errors.unknownCommand())
    }
  }

  private async undo(id: string, destination?: string): Promise<Notice> {
    const undo = this.data.undos.find(record => record.id === id && record.phase === 'committed' && record.expiresAt > Date.now())
    if (!undo)
      throw new Error(getT().errors.undoExpired())
    const payload = undo.payload
    if (payload.kind === 'delete') {
      const target = destination ?? payload.destination ?? payload.backup.parentId
      this.destination(target)
      if (indexTree(this.tree).has(payload.backup.node.id) && !payload.restored) {
        this.data.undos = this.data.undos.filter(record => record.id !== id)
        return {
          message: getT().errors.alreadyRestored(),
        }
      }
      if (payload.destination != null && payload.destination !== target && Object.keys(payload.restored ?? {}).length) {
        throw new Error(getT().errors.partialRestore())
      }
      payload.destination = target
      payload.restored ??= {}
      await this.save()
      const children = this.node(target).children ?? []
      let index = children.findIndex(node => node.id === payload.backup.followingId)
      if (index < 0) {
        const preceding = children.findIndex(node => node.id === payload.backup.precedingId)
        index = preceding >= 0
          ? preceding + 1
          : Math.min(payload.backup.index, children.length)
      }
      const restore = async (old: BookmarkNode, parentId: string, siblingIndex: number) => {
        const known = payload.restored![old.id]
        let newId = known
        if (!known || !indexTree(await this.bookmarks.getTree()).has(known)) {
          const created = await this.bookmarks.create({
            parentId,
            index: siblingIndex,
            ...(old.type === 'separator'
              ? { type: 'separator' as const }
              : { title: old.title }),
            ...(old.url !== undefined
              ? { url: old.url }
              : {}),
          })
          newId = created.id
          payload.restored![old.id] = newId
          // Persist progress so a partial restore can be retried without duplicating siblings.
          await this.save()
        }
        for (const [childIndex, child] of (old.children ?? []).entries()) await restore(child, newId, childIndex)
      }
      await restore(payload.backup.node, target, index)
      const map = payload.restored
      for (const [oldId, appearance] of Object.entries(payload.backup.appearance)) {
        if (map[oldId])
          this.data.appearance[map[oldId]] = appearance
      }
      // Remap restored folder ids in both view maps. Legacy records without a
      // Dock map restore as empty; that view re-places tiles on next read.
      for (const def of this.viewDefs()) {
        const backupMap = def.layoutsKey === 'layouts'
          ? payload.backup.layouts
          : payload.backup.dockLayouts
        for (const [oldId, layout] of Object.entries(backupMap ?? {})) {
          if (map[oldId]) {
            this.data[def.layoutsKey][map[oldId]] = layout.filter(item => map[item.i]).map(item => ({ ...item, i: map[item.i] }))
          }
        }
      }
      if (payload.backup.position) {
        const newId = map[payload.backup.node.id]
        if (newId) {
          for (const def of this.viewDefs()) {
            const key = def.layoutsKey
            const rows = def.rows
            const rest = (this.data[key][target] ?? []).filter(item => item.i !== newId)
            // A stale-view position may not fit this map; drop it and let
            // reconcileLayout re-place the tile on the next read.
            this.data[key] = fitsRows(payload.backup.position, rows)
              ? {
                  ...this.data[key],
                  [target]: [
                    ...rest,
                    { ...payload.backup.position, i: newId },
                  ],
                }
              : { ...this.data[key], [target]: rest }
          }
        }
      }
    }
    else if (payload.kind === 'move') {
      const node = this.editable(payload.nodeId)
      if (node.parentId !== payload.expectedParent)
        throw new Error(getT().errors.movedAgain())
      this.checkMove(node, payload.oldParent)
      const length = this.node(payload.oldParent).children?.length ?? 0
      await this.bookmarks.move(node.id, {
        parentId: payload.oldParent,
        index: Math.min(payload.oldIndex, length),
      })
      for (const def of this.viewDefs()) {
        const key = def.layoutsKey
        const filtered = { ...this.data[key] }
        for (const [groupId, layout] of Object.entries(filtered))
          filtered[groupId] = layout.filter(item => item.i !== node.id)
        this.data[key] = filtered
      }
      if (payload.position) {
        for (const def of this.viewDefs()) {
          const key = def.layoutsKey
          const rows = def.rows
          const rest = this.data[key][payload.oldParent] ?? []
          if (fitsRows(payload.position, rows)) {
            this.data[key] = {
              ...this.data[key],
              [payload.oldParent]: [...rest, payload.position],
            }
          }
        }
      }
    }
    else if (payload.kind === 'update') {
      const node = this.editable(payload.nodeId)
      if (node.title !== payload.after.title || node.url !== payload.after.url)
        throw new Error(getT().errors.editedAgain())
      await this.bookmarks.update(node.id, payload.before)
    }
    else {
      if (this.viewDefs().some(def => Object.keys(this.data[def.layoutsKey]).length))
        throw new Error(getT().errors.rearrangedSinceReset())
      this.data.layouts = payload.before
      this.data.dockLayouts = payload.beforeDock ?? {}
    }
    this.data.undos = this.data.undos.filter(record => record.id !== id)
    return {
      message: getT().notices.restored(),
    }
  }
}

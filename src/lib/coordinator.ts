import type {
  AppData, Appearance, BookmarkNode, BookmarkPort, Command, CommandResult, DeletedBackup,
  Layout, Notice, PersistencePort, Settings, Snapshot, UndoRecord,
} from './types';
import { MAX_ROWS, SIZES, freePosition, reconcileLayout, validateLayout } from './layout';
import { canAddTo, canModify, flatten, indexTree, isBookmark, isFolder, projectGroups, validateUrl } from './tree';
import { iconChoices } from './icons';

export const UNDO_TTL = 30_000;
export const DEFAULT_SETTINGS: Settings = {
  theme: 'midnight', density: 'comfortable', showDomains: true, reducedMotion: false,
  showMoreTiles: false,
};
export const emptyData = (): AppData => ({
  schema: 1, appearance: {}, layouts: {}, settings: { ...DEFAULT_SETTINGS }, undos: [],
});

/** A single writer for bookmark commands and extension metadata. No UI or DOM dependency. */
export class BookmarkCoordinator {
  private data = emptyData();
  private tree: BookmarkNode[] = [];
  private revision = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private unsubscribe: () => void;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  readonly ready: Promise<void>;

  constructor(
    private bookmarks: BookmarkPort,
    private persistence: PersistencePort,
    readonly mode: 'preview' | 'extension' = 'extension',
  ) {
    // Registration is synchronous, before the first asynchronous read.
    this.unsubscribe = bookmarks.onChange(() => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        void this.exclusive(async () => {
          if (this.disposed) return;
          await this.refresh();
          if (this.recoverPrepared()) await this.save();
          this.publish();
        }).catch((error: unknown) => console.error('Bookmark refresh failed:', error));
      }, 25);
    });
    this.ready = this.exclusive(async () => {
      const stored = await persistence.read();
      if (stored?.schema === 1) this.data = { ...emptyData(), ...stored, settings: { ...DEFAULT_SETTINGS, ...stored.settings } };
      await this.refresh();
      if (this.recoverPrepared()) await this.save();
    });
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
  private async refresh() { this.tree = await this.bookmarks.getTree(); this.revision++; }
  private async save() { await this.persistence.write(structuredClone(this.data)); }
  private publish() { for (const listener of this.listeners) listener(); }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  dispose() { this.disposed = true; clearTimeout(this.timer); this.unsubscribe(); this.listeners.clear(); }

  private node(id: string): BookmarkNode {
    if (typeof id !== 'string') throw new Error('Invalid bookmark identifier.');
    const node = indexTree(this.tree).get(id);
    if (!node) throw new Error('This bookmark or folder no longer exists.');
    return node;
  }
  private editable(id: string) {
    const node = this.node(id);
    if (!canModify(node, this.tree)) throw new Error('This browser-owned or managed item is read-only.');
    return node;
  }
  private destination(id: string) {
    const node = this.node(id);
    if (!canAddTo(node, this.tree)) throw new Error('Choose a writable bookmark folder, not the protected technical root.');
    return node;
  }
  private title(value: string): string {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Give this bookmark or folder a name.');
    if (value.length > 2048) throw new Error('That name is too long.');
    return value.trim();
  }
  private checkMove(node: BookmarkNode, parentId: string) {
    this.destination(parentId);
    if (flatten([node]).some((child) => child.id === parentId)) throw new Error('A folder cannot be moved into itself or a descendant.');
  }
  private currentSnapshot(): Snapshot {
    const ids = indexTree(this.tree);
    return structuredClone({
      tree: this.tree, appearance: this.data.appearance, layouts: this.data.layouts,
      settings: this.data.settings, revision: this.revision, mode: this.mode,
      undos: this.data.undos.filter((undo) => undo.phase === 'committed' && undo.expiresAt > Date.now()).map((undo) => ({
        id: undo.id, label: undo.label, expiresAt: undo.expiresAt,
        needsDestination: undo.payload.kind === 'delete' && !ids.has(undo.payload.backup.parentId),
      })),
    });
  }
  snapshot(): Promise<Snapshot> {
    return this.exclusive(async () => {
      await this.refresh();
      if (this.recoverPrepared()) await this.save();
      return this.currentSnapshot();
    });
  }
  private recoverPrepared(): boolean {
    const nodes = indexTree(this.tree);
    const previous = JSON.stringify(this.data.undos);
    this.data.undos = this.data.undos.filter((undo) => undo.expiresAt > Date.now()).filter((undo) => {
      if (undo.phase !== 'prepared') return true;
      const payload = undo.payload;
      let committed = false;
      if (payload.kind === 'delete') committed = !nodes.has(payload.backup.node.id);
      if (payload.kind === 'move') committed = nodes.get(payload.nodeId)?.parentId === payload.expectedParent;
      if (payload.kind === 'update') {
        const node = nodes.get(payload.nodeId);
        committed = node?.title === payload.after.title && node?.url === payload.after.url;
      }
      if (committed) undo.phase = 'committed';
      return committed;
    });
    return previous !== JSON.stringify(this.data.undos);
  }
  private async prepareUndo(label: string, payload: UndoRecord['payload']) {
    const undo: UndoRecord = { id: crypto.randomUUID(), label, payload, phase: 'prepared', expiresAt: Date.now() + UNDO_TTL };
    this.data.undos = this.data.undos.filter((record) => record.expiresAt > Date.now()).slice(-19);
    this.data.undos.push(undo);
    // The destructive API call is not allowed to proceed if this write fails.
    try { await this.save(); } catch (error) { this.data.undos = this.data.undos.filter((record) => record.id !== undo.id); throw error; }
    return undo;
  }
  private commitUndo(undo: UndoRecord) { undo.phase = 'committed'; undo.expiresAt = Date.now() + UNDO_TTL; }

  execute(command: Command): Promise<CommandResult> {
    return this.exclusive(async () => {
      if (!command || typeof command.type !== 'string') throw new Error('Invalid bookmark command.');
      await this.refresh();
      this.recoverPrepared();
      try {
        const notice = await this.perform(command);
        await this.refresh();
        await this.save();
        this.publish();
        return { snapshot: this.currentSnapshot(), notice };
      } catch (error) {
        await this.refresh();
        if (this.recoverPrepared()) await this.save().catch(() => undefined);
        this.publish();
        throw error;
      }
    });
  }

  private async perform(command: Command): Promise<Notice | undefined> {
    switch (command.type) {
      case 'bookmark.create': {
        this.destination(command.parentId);
        await this.bookmarks.create({ parentId: command.parentId, title: this.title(command.title), url: validateUrl(command.url) });
        return { message: 'Bookmark added. A new favorite, right at home.' };
      }
      case 'folder.create': {
        this.destination(command.parentId);
        await this.bookmarks.create({ parentId: command.parentId, title: this.title(command.title) });
        return { message: 'Folder created. Your new group is ready.' };
      }
      case 'node.update': {
        const node = this.editable(command.id);
        const after = { title: this.title(command.title), url: node.url };
        if (command.url !== undefined) {
          if (!isBookmark(node)) throw new Error('Folders cannot have website addresses.');
          after.url = validateUrl(command.url);
        }
        if (after.title === node.title && after.url === node.url) return undefined;
        const undo = await this.prepareUndo('Changes saved', { kind: 'update', nodeId: node.id, before: { title: node.title, url: node.url }, after });
        await this.bookmarks.update(node.id, after);
        this.commitUndo(undo);
        return { message: 'Changes saved.', undoId: undo.id };
      }
      case 'node.move': {
        const node = this.editable(command.id);
        this.checkMove(node, command.parentId);
        if (node.parentId === command.parentId) return undefined;
        const groups = projectGroups(this.currentSnapshot());
        const source = groups.find((group) => group.id === node.parentId);
        const target = groups.find((group) => group.id === command.parentId);
        const position = source?.layout.find((item) => item.i === node.id);
        const undo = await this.prepareUndo('Bookmark moved', { kind: 'move', nodeId: node.id,
          oldParent: node.parentId!, oldIndex: node.index ?? 0, expectedParent: command.parentId, position });
        await this.bookmarks.move(node.id, { parentId: command.parentId });
        if (isBookmark(node) && source && target && position) {
          this.data.layouts[source.id] = source.layout.filter((item) => item.i !== node.id);
          this.data.layouts[target.id] = [...target.layout, freePosition(target.layout, position, MAX_ROWS)];
        }
        this.commitUndo(undo);
        return { message: isFolder(node) ? 'Folder moved.' : 'Bookmark moved.', undoId: undo.id };
      }
      case 'node.remove': {
        const node = this.editable(command.id);
        if (flatten([node]).some((child) => !canModify(child, this.tree))) throw new Error('This folder contains managed items and cannot be deleted.');
        const ids = new Set(flatten([node]).map((child) => child.id));
        const siblings = this.node(node.parentId!).children ?? [];
        const index = siblings.findIndex((sibling) => sibling.id === node.id);
        const groups = projectGroups(this.currentSnapshot());
        const backup: DeletedBackup = {
          node: structuredClone(node), parentId: node.parentId!, index: Math.max(0, index),
          precedingId: siblings[index - 1]?.id, followingId: siblings[index + 1]?.id,
          appearance: Object.fromEntries(Object.entries(this.data.appearance).filter(([id]) => ids.has(id))),
          layouts: Object.fromEntries(Object.entries(this.data.layouts).filter(([id]) => ids.has(id))),
          position: groups.find((group) => group.id === node.parentId)?.layout.find((item) => item.i === node.id),
        };
        const label = isFolder(node) ? `“${node.title}” folder deleted` : `“${node.title}” deleted`;
        const undo = await this.prepareUndo(label, { kind: 'delete', backup });
        await this.bookmarks.remove(node.id, isFolder(node));
        for (const id of ids) { delete this.data.appearance[id]; delete this.data.layouts[id]; }
        for (const [id, layout] of Object.entries(this.data.layouts)) this.data.layouts[id] = layout.filter((item) => !ids.has(item.i));
        this.commitUndo(undo);
        return { message: label, undoId: undo.id };
      }
      case 'tile.appearance': {
        const node = this.node(command.id);
        if (!isBookmark(node)) throw new Error('Only bookmark tiles have an appearance.');
        const patch: Appearance = {};
        if (command.patch.size !== undefined) {
          if (!(command.patch.size in SIZES)) throw new Error('Choose a supported tile size.');
          patch.size = command.patch.size;
        }
        if (command.patch.color !== undefined) {
          if (!/^#[0-9a-f]{6}$/i.test(command.patch.color)) throw new Error('Use a six-digit hex color.');
          patch.color = command.patch.color;
        }
        if (command.patch.icon !== undefined) {
          if (command.patch.icon !== 'auto' && !iconChoices.includes(command.patch.icon)) throw new Error('Choose a bundled icon.');
          if (command.patch.icon !== 'auto') patch.icon = command.patch.icon;
        }
        const group = projectGroups(this.currentSnapshot()).find((entry) => entry.id === node.parentId);
        const existing = { ...this.data.appearance[node.id] };
        if (command.patch.icon === 'auto') delete existing.icon;
        this.data.appearance[node.id] = { ...existing, ...patch };
        if (group) this.data.layouts[group.id] = reconcileLayout((this.node(group.id).children ?? []).filter(isBookmark), this.data.layouts[group.id] ?? group.layout, this.data.appearance, MAX_ROWS);
        return undefined;
      }
      case 'layout.commit': {
        if (!command.layouts || typeof command.layouts !== 'object') throw new Error('Invalid group layouts.');
        const nodes = indexTree(this.tree);
        const layouts: Record<string, Layout> = {};
        const ownership = new Map<string, string>();
        const moves: { node: BookmarkNode; destination: string }[] = [];
        for (const [folderId, raw] of Object.entries(command.layouts)) {
          if (!isFolder(this.node(folderId))) throw new Error('A tile group must be a folder.');
          const layout = validateLayout(raw);
          for (const item of layout) {
            const node = nodes.get(item.i);
            if (!node || !isBookmark(node)) throw new Error('A tile changed while you were arranging. Try again.');
            if (ownership.has(node.id)) throw new Error('A tile cannot belong to two groups.');
            ownership.set(node.id, folderId);
            if (node.parentId !== folderId) { this.editable(node.id); this.checkMove(node, folderId); moves.push({ node, destination: folderId }); }
          }
          layouts[folderId] = layout;
        }
        if (moves.length > 1) throw new Error('Move one bookmark at a time between groups.');
        let undo: UndoRecord | undefined;
        if (moves[0]) {
          const { node, destination } = moves[0];
          const position = projectGroups(this.currentSnapshot()).find((group) => group.id === node.parentId)?.layout.find((item) => item.i === node.id);
          undo = await this.prepareUndo('Bookmark moved', { kind: 'move', nodeId: node.id, oldParent: node.parentId!,
            oldIndex: node.index ?? 0, expectedParent: destination, position });
          await this.bookmarks.move(node.id, { parentId: destination });
          this.commitUndo(undo);
        }
        Object.assign(this.data.layouts, layouts);
        return undo ? { message: 'Bookmark moved to its new folder.', undoId: undo.id } : undefined;
      }
      case 'settings.update': {
        const patch = command.patch;
        if (patch.theme !== undefined && !['midnight', 'dusk', 'forest', 'paper'].includes(patch.theme)) throw new Error('Invalid theme.');
        if (patch.density !== undefined && !['comfortable', 'compact'].includes(patch.density)) throw new Error('Invalid density.');
        if (patch.showDomains !== undefined && typeof patch.showDomains !== 'boolean') throw new Error('Invalid domain setting.');
        if (patch.reducedMotion !== undefined && typeof patch.reducedMotion !== 'boolean') throw new Error('Invalid motion setting.');
        if (patch.showMoreTiles !== undefined && typeof patch.showMoreTiles !== 'boolean') throw new Error('Invalid tile grid setting.');
        this.data.settings = { ...this.data.settings, ...patch };
        return undefined;
      }
      case 'layout.reset': {
        const undo: UndoRecord = { id: crypto.randomUUID(), label: 'Tile layouts reset', phase: 'committed', expiresAt: Date.now() + UNDO_TTL,
          payload: { kind: 'layouts', before: structuredClone(this.data.layouts) } };
        this.data.undos.push(undo);
        this.data.layouts = {};
        return { message: 'Tile layouts reset to bookmark order.', undoId: undo.id };
      }
      case 'undo': return this.undo(command.id, command.parentId);
      default: throw new Error('Unknown bookmark command.');
    }
  }

  private async undo(id: string, destination?: string): Promise<Notice> {
    const undo = this.data.undos.find((record) => record.id === id && record.phase === 'committed' && record.expiresAt > Date.now());
    if (!undo) throw new Error('This undo has expired.');
    const payload = undo.payload;
    if (payload.kind === 'delete') {
      const target = destination ?? payload.destination ?? payload.backup.parentId;
      this.destination(target);
      if (indexTree(this.tree).has(payload.backup.node.id) && !payload.restored) {
        this.data.undos = this.data.undos.filter((record) => record.id !== id);
        return { message: 'This item has already been restored.' };
      }
      if (payload.destination && payload.destination !== target && Object.keys(payload.restored ?? {}).length) {
        throw new Error('Continue this partial restore in its original destination.');
      }
      payload.destination = target;
      payload.restored ??= {};
      await this.save();
      const children = this.node(target).children ?? [];
      let index = children.findIndex((node) => node.id === payload.backup.followingId);
      if (index < 0) {
        const preceding = children.findIndex((node) => node.id === payload.backup.precedingId);
        index = preceding >= 0 ? preceding + 1 : Math.min(payload.backup.index, children.length);
      }
      const restore = async (old: BookmarkNode, parentId: string, siblingIndex: number) => {
        const known = payload.restored![old.id];
        let newId = known;
        if (!known || !indexTree(await this.bookmarks.getTree()).has(known)) {
          const created = await this.bookmarks.create({ parentId, index: siblingIndex,
            ...(old.type === 'separator' ? { type: 'separator' as const } : { title: old.title }),
            ...(old.url !== undefined ? { url: old.url } : {}) });
          newId = created.id;
          payload.restored![old.id] = newId;
          // Persist progress so a partial restore can be retried without duplicating siblings.
          await this.save();
        }
        for (const [childIndex, child] of (old.children ?? []).entries()) await restore(child, newId, childIndex);
      };
      await restore(payload.backup.node, target, index);
      const map = payload.restored;
      for (const [oldId, appearance] of Object.entries(payload.backup.appearance)) if (map[oldId]) this.data.appearance[map[oldId]] = appearance;
      for (const [oldId, layout] of Object.entries(payload.backup.layouts)) if (map[oldId]) {
        this.data.layouts[map[oldId]] = layout.filter((item) => map[item.i]).map((item) => ({ ...item, i: map[item.i] }));
      }
      if (payload.backup.position) {
        await this.refresh();
        const group = projectGroups(this.currentSnapshot()).find((entry) => entry.id === target);
        const newId = map[payload.backup.node.id];
        if (group && newId) this.data.layouts[target] = [
          ...group.layout.filter((item) => item.i !== newId), { ...payload.backup.position, i: newId },
        ];
      }
    } else if (payload.kind === 'move') {
      const node = this.editable(payload.nodeId);
      if (node.parentId !== payload.expectedParent) throw new Error('This item was moved again elsewhere. Undo would overwrite that change.');
      this.checkMove(node, payload.oldParent);
      const length = this.node(payload.oldParent).children?.length ?? 0;
      await this.bookmarks.move(node.id, { parentId: payload.oldParent, index: Math.min(payload.oldIndex, length) });
      for (const key of Object.keys(this.data.layouts)) this.data.layouts[key] = this.data.layouts[key].filter((item) => item.i !== node.id);
      if (payload.position) this.data.layouts[payload.oldParent] = [...(this.data.layouts[payload.oldParent] ?? []), payload.position];
    } else if (payload.kind === 'update') {
      const node = this.editable(payload.nodeId);
      if (node.title !== payload.after.title || node.url !== payload.after.url) throw new Error('This item was edited elsewhere. Undo would overwrite that change.');
      await this.bookmarks.update(node.id, payload.before);
    } else {
      if (Object.keys(this.data.layouts).length) throw new Error('Tiles have been rearranged since the reset. Undo would overwrite the new layout.');
      this.data.layouts = payload.before;
    }
    this.data.undos = this.data.undos.filter((record) => record.id !== id);
    return { message: 'Restored. Right where it belongs.' };
  }
}

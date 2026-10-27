import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryBookmarks, MemoryPersistence } from '../src/lib/adapters/memory'
import { SETTINGS_DEFAULTS } from '../src/lib/config'
import { BookmarkCoordinator, UNDO_TTL } from '../src/lib/coordinator'
import { demoData, demoTree } from '../src/lib/demo'
import { flatten, indexTree, isBookmark, projectGroups } from '../src/lib/tree'

const coordinators: BookmarkCoordinator[] = []
function fixture() {
  const bookmarks = new MemoryBookmarks(demoTree())
  const storage = new MemoryPersistence(demoData())
  const coordinator = new BookmarkCoordinator(bookmarks, storage, SETTINGS_DEFAULTS, 'preview')
  coordinators.push(coordinator)
  return { bookmarks, storage, coordinator }
}
afterEach(() => {
  for (const coordinator of coordinators.splice(0)) coordinator.dispose()
  vi.useRealTimers()
})

describe('commands and synchronization', () => {
  it('edits the browser bookmark and safely undoes the edit', async () => {
    const { coordinator } = fixture()
    const result = await coordinator.execute({ type: 'node.update', id: 'steam', title: 'Design files', url: 'https://store.steampowered.com/files' })
    expect(indexTree(result.snapshot.tree).get('steam')?.title).toBe('Design files')
    const restored = await coordinator.execute({ type: 'undo', id: result.notice!.undoId! })
    expect(indexTree(restored.snapshot.tree).get('steam')?.title).toBe('Steam')
  })
  it('observes external bookmark manager changes without writing them back', async () => {
    const { bookmarks, coordinator } = fixture()
    await coordinator.ready
    await bookmarks.update('steam', { title: 'Externally edited' })
    expect(indexTree((await coordinator.snapshot()).tree).get('steam')?.title).toBe('Externally edited')
  })
  it('moves a bookmark between real folders', async () => {
    const { coordinator } = fixture()
    const result = await coordinator.execute({ type: 'node.move', id: 'steam', parentId: 'work' })
    expect(indexTree(result.snapshot.tree).get('steam')?.parentId).toBe('work')
    expect(projectGroups(result.snapshot).find(group => group.id === 'work')?.tiles.steam.size).toBe('large')
    const undo = await coordinator.execute({ type: 'undo', id: result.notice!.undoId! })
    expect(indexTree(undo.snapshot.tree).get('steam')?.parentId).toBe('bar')
  })
  it('does not reorder native bookmarks when the visual layout changes', async () => {
    const { coordinator, bookmarks } = fixture()
    const before = indexTree(await bookmarks.getTree()).get('bar')!.children!.map(node => node.id)
    const layout = projectGroups(await coordinator.snapshot())[0].layout.map(entry => ({ ...entry, x: entry.x + 5 }))
    await coordinator.execute({ type: 'layout.commit', layouts: { bar: layout } })
    expect(indexTree(await bookmarks.getTree()).get('bar')!.children!.map(node => node.id)).toEqual(before)
  })
  it('combines cross-grid callbacks into one native move', async () => {
    const { coordinator, bookmarks } = fixture()
    const move = vi.spyOn(bookmarks, 'move')
    const groups = projectGroups(await coordinator.snapshot())
    const source = groups[0]
    const destination = groups[1]
    const moving = source.layout.find(entry => entry.i === 'steam')!
    const result = await coordinator.execute({ type: 'layout.commit', layouts: {
      bar: source.layout.filter(entry => entry.i !== 'steam'),
      work: [...destination.layout, { ...moving, x: 4, y: 0 }],
    } })
    expect(move).toHaveBeenCalledTimes(1)
    expect(indexTree(result.snapshot.tree).get('steam')?.parentId).toBe('work')
  })
  it('keeps empty source folders after moving their last bookmark', async () => {
    const { coordinator } = fixture()
    await coordinator.execute({ type: 'node.move', id: 'storybook', parentId: 'bar' })
    const result = await coordinator.execute({ type: 'node.move', id: 'snapgrid', parentId: 'bar' })
    expect(projectGroups(result.snapshot).find(group => group.id === 'tools')?.layout).toEqual([])
  })
  it('protects browser containers from destructive operations', async () => {
    const { coordinator } = fixture()
    await expect(coordinator.execute({ type: 'node.remove', id: 'bar' })).rejects.toThrow('read-only')
    await expect(coordinator.execute({ type: 'node.update', id: 'bar', title: 'Mine' })).rejects.toThrow('read-only')
    await expect(coordinator.execute({ type: 'folder.create', parentId: 'root', title: 'Forbidden' })).rejects.toThrow('protected technical root')
  })
  it('rejects moving a folder into its descendants', async () => {
    const { coordinator } = fixture()
    await expect(coordinator.execute({ type: 'node.move', id: 'learning', parentId: 'tools' })).rejects.toThrow('descendant')
  })
  it('resizes tiles and persists metadata without modifying the bookmark', async () => {
    const { coordinator, bookmarks } = fixture()
    const update = vi.spyOn(bookmarks, 'update')
    const result = await coordinator.execute({ type: 'tile.appearance', id: 'steam', patch: { size: 'small', colorIndex: 3, color: '#123456' } })
    expect(result.snapshot.appearance.steam).toEqual({ size: 'small', colorIndex: 3, color: '#123456' })
    expect(update).not.toHaveBeenCalled()
  })
})

describe('bookmark creation', () => {
  it('stores the suggested swatch index without a custom color', async () => {
    const { coordinator, storage } = fixture()
    const result = await coordinator.execute({ type: 'bookmark.create', parentId: 'bar', title: 'Example', url: 'https://example.com', colorIndex: 5 })
    const created = flatten(result.snapshot.tree).find(node => node.url === 'https://example.com')!
    expect(result.snapshot.appearance[created.id]).toEqual({ colorIndex: 5 })
    expect(result.snapshot.appearance[created.id]?.color).toBeUndefined()
    expect(storage.data?.appearance[created.id]).toEqual({ colorIndex: 5 })
  })
  it('keeps the hashed accent when no swatch is available', async () => {
    const { coordinator } = fixture()
    const result = await coordinator.execute({ type: 'bookmark.create', parentId: 'bar', title: 'Example', url: 'https://example.com' })
    const created = flatten(result.snapshot.tree).find(node => node.url === 'https://example.com')!
    expect(result.snapshot.appearance[created.id]).toBeUndefined()
  })
  it('rejects an invalid color index before creating the bookmark', async () => {
    const { coordinator, bookmarks } = fixture()
    const create = vi.spyOn(bookmarks, 'create')
    await expect(coordinator.execute({ type: 'bookmark.create', parentId: 'bar', title: 'Example', url: 'https://example.com', colorIndex: 8 })).rejects.toThrow('Color index')
    expect(create).not.toHaveBeenCalled()
  })
})

describe('durable Undo', () => {
  it('immediately deletes and restores a bookmark under a new ID with its appearance', async () => {
    const { coordinator } = fixture()
    await coordinator.execute({ type: 'tile.appearance', id: 'steam', patch: { colorIndex: 3, color: '#123456' } })
    const deleted = await coordinator.execute({ type: 'node.remove', id: 'steam' })
    expect(indexTree(deleted.snapshot.tree).has('steam')).toBe(false)
    expect(deleted.snapshot.undos).toHaveLength(1)
    const restored = await coordinator.execute({ type: 'undo', id: deleted.notice!.undoId! })
    const newNode = flatten(restored.snapshot.tree).find(node => node.title === 'Steam')!
    expect(newNode.id).not.toBe('steam')
    expect(restored.snapshot.appearance[newNode.id]?.color).toBe('#123456')
    expect(restored.snapshot.layouts.bar.some(entry => entry.i === newNode.id)).toBe(true)
  })
  it('restores an entire folder hierarchy, ordering, and ID-remapped layouts', async () => {
    const { coordinator } = fixture()
    const deleted = await coordinator.execute({ type: 'node.remove', id: 'learning' })
    expect(indexTree(deleted.snapshot.tree).has('tools')).toBe(false)
    const restored = await coordinator.execute({ type: 'undo', id: deleted.notice!.undoId! })
    const learning = flatten(restored.snapshot.tree).find(node => node.title === 'Learning')!
    expect(learning.children?.map(node => node.title)).toEqual(['MDN Web Docs', 'Svelte', 'TypeScript', 'Tailwind CSS', 'Tools'])
    expect(flatten([learning]).filter(isBookmark)).toHaveLength(6)
    expect(restored.snapshot.layouts[learning.id]).toHaveLength(4)
    for (const entry of restored.snapshot.layouts[learning.id]) expect(indexTree(restored.snapshot.tree).has(entry.i)).toBe(true)
  })
  it('aborts before deletion if the recovery record cannot be persisted', async () => {
    const { coordinator, bookmarks, storage } = fixture()
    await coordinator.ready
    vi.spyOn(storage, 'write').mockRejectedValue(new Error('Storage quota exceeded'))
    const remove = vi.spyOn(bookmarks, 'remove')
    await expect(coordinator.execute({ type: 'node.remove', id: 'steam' })).rejects.toThrow('Storage quota')
    expect(remove).not.toHaveBeenCalled()
    expect(indexTree(await bookmarks.getTree()).has('steam')).toBe(true)
  })
  it('recovers a prepared record after a background restart', async () => {
    const { coordinator, bookmarks, storage } = fixture()
    const result = await coordinator.execute({ type: 'node.remove', id: 'steam' })
    coordinator.dispose()
    storage.data!.undos[0].phase = 'prepared'
    const next = new BookmarkCoordinator(bookmarks, storage, SETTINGS_DEFAULTS, 'preview')
    coordinators.push(next)
    const snapshot = await next.snapshot()
    expect(snapshot.undos[0].id).toBe(result.notice!.undoId)
    await next.execute({ type: 'undo', id: snapshot.undos[0].id })
    expect(flatten((await next.snapshot()).tree).some(node => node.title === 'Steam')).toBe(true)
  })
  it('refuses to overwrite newer external edits', async () => {
    const { coordinator, bookmarks } = fixture()
    const edited = await coordinator.execute({ type: 'node.update', id: 'steam', title: 'First change' })
    await bookmarks.update('steam', { title: 'Newer external change' })
    await expect(coordinator.execute({ type: 'undo', id: edited.notice!.undoId! })).rejects.toThrow('edited elsewhere')
    expect(indexTree(await bookmarks.getTree()).get('steam')?.title).toBe('Newer external change')
  })
  it('allows choosing a recovery destination if the original parent was deleted', async () => {
    const { coordinator, bookmarks } = fixture()
    const deleted = await coordinator.execute({ type: 'node.remove', id: 'slack' })
    await bookmarks.remove('work', true)
    expect((await coordinator.snapshot()).undos[0].needsDestination).toBe(true)
    const restored = await coordinator.execute({ type: 'undo', id: deleted.notice!.undoId!, parentId: 'other' })
    expect(flatten(restored.snapshot.tree).find(node => node.title === 'Slack')?.parentId).toBe('other')
  })
  it('expires Undo using timestamps, not a background timer', async () => {
    const { coordinator } = fixture()
    const deleted = await coordinator.execute({ type: 'node.remove', id: 'steam' })
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + UNDO_TTL + 1)
    await expect(coordinator.execute({ type: 'undo', id: deleted.notice!.undoId! })).rejects.toThrow('expired')
  })
  it('undoes reset layouts without resetting appearance', async () => {
    const { coordinator } = fixture()
    const reset = await coordinator.execute({ type: 'layout.reset' })
    expect(reset.snapshot.layouts).toEqual({})
    expect(reset.snapshot.appearance.steam.size).toBe('large')
    const undone = await coordinator.execute({ type: 'undo', id: reset.notice!.undoId! })
    expect(undone.snapshot.layouts.bar).toHaveLength(5)
  })
})

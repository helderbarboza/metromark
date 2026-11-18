import type { PlaylistCursorStorage } from '$lib/playlist-cursor'
import { createPlaylistCursorStore } from '$lib/playlist-cursor'
import { describe, expect, it } from 'vitest'

const KEY = 'metromark.playlist-cursor'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const storage: PlaylistCursorStorage = {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
  }
  return { map, storage }
}

describe('createPlaylistCursorStore', () => {
  it('reads null for an unknown playlist and round-trips the next index', () => {
    const { map, storage } = fakeStorage()
    const store = createPlaylistCursorStore(storage)
    expect(store.read('PLnew')).toBeNull()
    store.write('PLnew', 3)
    expect(store.read('PLnew')).toBe(3)
    expect(JSON.parse(map.get(KEY)!)).toEqual({ PLnew: 3 })
    store.write('PLother', 1)
    expect(store.read('PLnew')).toBe(3) // playlists do not clobber each other
    expect(store.read('PLother')).toBe(1)
  })

  it('returns null for corrupt data instead of throwing', () => {
    for (const corrupt of [
      'not json',
      '[]',
      '42',
      '{"PL": "three"}',
      '{"PL": -1}',
      '{"PL": 1.5}',
    ]) {
      const { storage } = fakeStorage({ [KEY]: corrupt })
      const store = createPlaylistCursorStore(storage)
      expect(store.read('PL')).toBeNull()
      store.write('PL', 2) // must not throw either
      expect(store.read('PL')).toBe(2)
    }
  })

  it('works without storage: reads are null, writes are dropped', () => {
    const store = createPlaylistCursorStore(undefined)
    expect(store.read('PL')).toBeNull()
    expect(() => store.write('PL', 1)).not.toThrow()
    expect(store.read('PL')).toBeNull()
  })
})

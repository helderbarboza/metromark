// Sequential playlist order for the YouTube background.
// Renderer-only state: the background worker never needs the cursor.
// The bridge stays storage-agnostic and unit-testable; this module is the
// adapter. Stale entries for deleted playlists are harmless (they are keyed
// by playlist ID and simply never match again).

const KEY = 'metromark.playlist-cursor'

/** The subset of the Storage interface the cursor needs; tests inject a fake. */
export interface PlaylistCursorStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface PlaylistCursorStore {
  /** The index of the video a new tab should play, or null when unknown/invalid. */
  read: (playlistId: string) => number | null
  /** Remember which video comes next after the one just picked. */
  write: (playlistId: string, nextIndex: number) => void
}

function readMap(storage: PlaylistCursorStorage | undefined): Record<string, number> {
  if (!storage)
    return {}
  try {
    const raw = storage.getItem(KEY)
    if (raw === null || raw === '')
      return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null)
      return {}
    const out: Record<string, number> = {}
    for (const [playlistId, index] of Object.entries(parsed)) {
      if (typeof index === 'number' && Number.isInteger(index) && index >= 0)
        out[playlistId] = index
    }
    return out
  }
  catch {
    return {}
  }
}

/**
 * Create the cursor store. Defaults to localStorage (it works in the
 * extension new-tab page and the isolated preview); storage that is missing
 * or refuses to read turns the sequential mode into "start at 0" without
 * failing the page.
 */
export function createPlaylistCursorStore(
  storage: PlaylistCursorStorage | undefined
    = typeof globalThis.localStorage === 'undefined'
      ? undefined
      : globalThis.localStorage,
): PlaylistCursorStore {
  return {
    read(playlistId) {
      return readMap(storage)[playlistId] ?? null
    },
    write(playlistId, nextIndex) {
      if (!storage)
        return
      try {
        const map = readMap(storage)
        map[playlistId] = nextIndex
        storage.setItem(KEY, JSON.stringify(map))
      }
      catch {
        // Quota or policy refusal: the playlist still plays, just not sequentially.
      }
    },
  }
}

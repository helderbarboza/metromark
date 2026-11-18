// Persistent store for converted favicon glyphs in IndexedDB. Data URLs are
// stored directly (a flat 2-tone 128 px PNG is a few KB), so a cache hit is a
// plain string read with no decode, no canvas work and no PNG re-encode.
// All operations are best-effort: failures are logged and swallowed so a
// missing, blocked or full IndexedDB never breaks tile icons.

import type { GlyphRecord } from '$lib/favicon-policy'
import { evictOldest, MAX_ENTRIES } from '$lib/favicon-policy'

const DB_NAME = 'metromark-favicons-v1'
const STORE_NAME = 'glyphs'

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'))
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another tab.'))
  })
}

async function transactionDone(tx: IDBTransaction, fallback: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error(fallback))
    tx.onabort = () => reject(tx.error ?? new Error(fallback))
  })
}

function isGlyphRecord(value: unknown): value is GlyphRecord {
  if (typeof value !== 'object' || value === null)
    return false
  // eslint-disable-next-line ts/consistent-type-assertions
  const record = value as Record<string, unknown>
  return typeof record.key === 'string'
    && typeof record.dataUrl === 'string'
    && Number.isFinite(record.created)
    && Number.isFinite(record.fingerprint)
    && Number.isFinite(record.lastChecked)
}

/** Read a stored glyph. Returns undefined for unknown keys, malformed records, or any failure. */
export async function loadCachedGlyph(key: string): Promise<GlyphRecord | undefined> {
  try {
    const db = await openDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(key)
      return await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(isGlyphRecord(request.result)
          ? request.result
          : undefined)
        request.onerror = () => reject(request.error ?? new Error('Unable to read the cached icon.'))
      })
    }
    finally {
      db.close()
    }
  }
  catch (error) {
    console.warn('[favicons] Reading the glyph cache failed.', error)
    return undefined
  }
}

/** Store a glyph and evict the oldest entries when the cap is exceeded. Failures are logged and ignored. */
export async function saveCachedGlyph(record: GlyphRecord): Promise<void> {
  try {
    const db = await openDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(record)
      await transactionDone(tx, 'Unable to cache the icon.')
    }
    finally {
      db.close()
    }
  }
  catch (error) {
    console.warn('[favicons] Caching the icon failed.', error)
    return
  }
  try {
    await evictIfOverCap()
  }
  catch (error) {
    console.warn('[favicons] Glyph cache eviction failed.', error)
  }
}

async function evictIfOverCap(): Promise<void> {
  const db = await openDb()
  try {
    const records = await new Promise<Pick<GlyphRecord, 'key' | 'created'>[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => {
        const result: unknown = request.result
        if (!Array.isArray(result))
          return resolve([])
        resolve(result
          .filter(isGlyphRecord)
          .map(record => ({ key: record.key, created: record.created })))
      }
      request.onerror = () => reject(request.error ?? new Error('Unable to list cached icons.'))
    })
    const doomed = evictOldest(records, MAX_ENTRIES)
    if (doomed.length === 0)
      return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    for (const key of doomed)
      tx.objectStore(STORE_NAME).delete(key)
    await transactionDone(tx, 'Unable to evict cached icons.')
  }
  finally {
    db.close()
  }
}

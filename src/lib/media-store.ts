// Background media in IndexedDB. Uploaded blobs live in the extension origin's
// storage pool (the demo preview gets the same API in its own origin), so
// settings, Undo records and snapshot broadcasts only carry a short `idb:<uuid>`
// reference instead of megabytes of base64.

import { isMediaKey } from '$lib/background-image'

const DB_NAME = 'metromark-media-v1'
const STORE_NAME = 'backgrounds'
const DB_VERSION = 1

interface MediaRecord {
  key: string
  blob: Blob
  created: number
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'))
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another tab. Reload and try again.'))
  })
}

async function transactionDone(tx: IDBTransaction, fallback: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error(fallback))
    tx.onabort = () => reject(tx.error ?? new Error(fallback))
  })
}

/** Store a blob and return its `idb:<uuid>` key. Throws when the write fails (quota, blocked). */
export async function saveBackgroundMedia(blob: Blob): Promise<string> {
  const key = `idb:${crypto.randomUUID()}`
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({
      key,
      blob,
      created: Date.now(),
    } satisfies MediaRecord)
    await transactionDone(tx, 'Unable to store the image.')
  }
  finally {
    db.close()
  }
  // Best effort: ask the browser not to evict this origin's storage under pressure.
  try {
    await navigator.storage?.persist?.()
  }
  catch {
    // Persistence is advisory; failures do not affect the upload.
  }
  return key
}

/** Read a blob previously stored under `key`. Returns undefined for unknown or malformed keys. */
export async function loadBackgroundMedia(key: string): Promise<Blob | undefined> {
  if (!isMediaKey(key))
    return undefined
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const record: unknown = request.result
        if (record !== null && typeof record === 'object' && 'blob' in record && record.blob instanceof Blob)
          resolve(record.blob)
        else
          resolve(undefined)
      }
      request.onerror = () => reject(request.error ?? new Error('Unable to read the stored image.'))
    })
  }
  finally {
    db.close()
  }
}

/** Delete one stored blob. Unknown keys and malformed ids are ignored. */
export async function deleteBackgroundMedia(key: string): Promise<void> {
  if (!isMediaKey(key))
    return
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    await transactionDone(tx, 'Unable to remove the stored image.')
  }
  finally {
    db.close()
  }
}

/**
 * Delete every stored blob that is not in `referenced`. Run once per page load;
 * it reclaims media orphaned by a factory reset or by switching background
 * type without going through the settings UI (the factory reset itself is
 * coordinator-side and cannot reach the page).
 */
export async function sweepBackgroundMedia(referenced: readonly string[]): Promise<void> {
  const keep = new Set(referenced)
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const keysRequest = tx.objectStore(STORE_NAME).getAllKeys()
    const keys = await new Promise<string[]>((resolve, reject) => {
      keysRequest.onsuccess = () => {
        const result: unknown = keysRequest.result
        resolve(Array.isArray(result)
          ? result.filter((key): key is string => typeof key === 'string')
          : [])
      }
      keysRequest.onerror = () => reject(keysRequest.error ?? new Error('Unable to list stored images.'))
    })
    const orphans = keys.filter(key => !keep.has(key))
    if (orphans.length === 0)
      return
    const deleteTx = db.transaction(STORE_NAME, 'readwrite')
    for (const key of orphans)
      deleteTx.objectStore(STORE_NAME).delete(key)
    await transactionDone(deleteTx, 'Unable to remove orphaned images.')
  }
  finally {
    db.close()
  }
}

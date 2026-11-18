const STORAGE_KEY = 'root-filter'
const ALL = 'all'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage
  }
  catch {
    // Accessing localStorage can throw (for example, disabled cookies).
    return null
  }
}

/** Load the saved root filter. Returns 'all' when nothing valid is stored. */
export function loadRootFilter(): string {
  const store = storage()
  if (!store)
    return ALL
  try {
    const saved = store.getItem(STORAGE_KEY)
    return saved !== null && saved.length > 0
      ? saved
      : ALL
  }
  catch {
    return ALL
  }
}

/** Persist the root filter. Failures are ignored; the filter still works for this session. */
export function saveRootFilter(id: string): void {
  const store = storage()
  if (!store)
    return
  try {
    store.setItem(STORAGE_KEY, id)
  }
  catch {
    // Storage unavailable or full; keep the in-memory selection.
  }
}

/** Clear the saved root filter (factory reset). */
export function resetRootFilter(): void {
  const store = storage()
  if (!store)
    return
  try {
    store.removeItem(STORAGE_KEY)
  }
  catch {
    // Storage unavailable; nothing to clear.
  }
}

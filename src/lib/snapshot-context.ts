import type { Snapshot } from '$lib/types'
import { createContext } from 'svelte'

/**
 * Current snapshot for the app subtree. Set once by the root component as a
 * getter closure so consumers reading it inside `$derived` stay reactive.
 * Components that can mount before load read the nullable value directly.
 */
export const [getSnapshot, setSnapshot]
  = createContext<() => Snapshot | null>()

/**
 * Get a snapshot reader for a component that mounts only after load.
 * Call this during component initialisation, then use the returned closure in
 * `$derived` expressions. A null snapshot throws instead of yielding an
 * invalid view.
 */
export function requireSnapshot(): () => Snapshot {
  const read = getSnapshot()
  return () => {
    const snapshot = read()
    if (!snapshot)
      throw new Error('Snapshot is not available in this context')
    return snapshot
  }
}

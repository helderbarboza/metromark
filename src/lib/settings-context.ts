import type { Settings } from '$lib/config'
import { createContext } from 'svelte'

export interface SettingsContext {
  /** Current settings from the snapshot. */
  settings: Settings
  /** A settings command is in flight. */
  busy: boolean
  /** Queue a settings patch through the settings dialog's command channel. */
  update: (patch: Partial<Settings>) => void
}

/**
 * Settings values for the settings dialog's subtree. Set once by the dialog
 * as a getter closure so consumers reading it inside `$derived` stay reactive.
 * There is no fallback for a missing provider: `getSettingsContext()` throws,
 * and every consumer mounts under the dialog.
 */
export const [getSettingsContext, setSettingsContext]
  = createContext<() => SettingsContext>()

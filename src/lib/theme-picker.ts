import type { DarkTheme, LightTheme, ThemeChoice, ThemeMode } from '$lib/themes.js'
import { DARK_THEMES, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, LIGHT_THEMES } from '$lib/themes.js'
import { mode, setMode, setTheme, systemPrefersMode } from 'mode-watcher'

export { DARK_THEMES, LIGHT_THEMES } from '$lib/themes.js'
export type { DarkTheme, LightTheme, ThemeChoice, ThemeMode } from '$lib/themes.js'

export interface ThemeSelections {
  light: LightTheme
  dark: DarkTheme
}

const STORAGE_KEY = 'app-theme-selections'
const DEFAULTS: ThemeSelections = {
  light: DEFAULT_LIGHT_THEME,
  dark: DEFAULT_DARK_THEME,
}

export function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  if (typeof value !== 'string') {
    return false
  }
  for (const v of values) {
    if (v === value) {
      return true
    }
  }
  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function loadSelections(): ThemeSelections {
  if (typeof localStorage === 'undefined')
    return { ...DEFAULTS }

  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!isRecord(saved))
      return { ...DEFAULTS }

    return {
      light: isOneOf(saved.light, LIGHT_THEMES) ? saved.light : DEFAULTS.light,
      dark: isOneOf(saved.dark, DARK_THEMES) ? saved.dark : DEFAULTS.dark,
    }
  }
  catch {
    return { ...DEFAULTS }
  }
}

let selections = loadSelections()

function saveSelections(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
    // Sync current mode's theme to mode-watcher's storage for consistency
    const currentMode = mode.current
    if (currentMode)
      localStorage.setItem('mode-watcher-theme', selections[currentMode])
  }
  catch {
    // Theme selection still works for this session if storage is unavailable.
  }
}

export function getThemeSelections(): ThemeSelections {
  return { ...selections }
}

/**
 * Choose the theme to use for one mode. This never changes the light/dark mode.
 * The active data-theme is updated only when `targetMode` is the current mode.
 */
export function setThemeForMode(targetMode: 'light', theme: LightTheme): void
export function setThemeForMode(targetMode: 'dark', theme: DarkTheme): void
export function setThemeForMode(targetMode: ThemeMode, theme: ThemeChoice): void {
  if (targetMode === 'light' && isOneOf(theme, LIGHT_THEMES)) {
    selections = { ...selections, light: theme }
  }
  else if (targetMode === 'dark' && isOneOf(theme, DARK_THEMES)) {
    selections = { ...selections, dark: theme }
  }
  else {
    throw new Error(`Theme "${theme}" is not available for ${targetMode} mode.`)
  }

  saveSelections()

  // setTheme changes only data-theme; it does not call setMode or toggleMode.
  if (mode.current === targetMode)
    setTheme(theme)
}

export function setLightTheme(theme: LightTheme): void {
  setThemeForMode('light', theme)
}

export function setDarkTheme(theme: DarkTheme): void {
  setThemeForMode('dark', theme)
}

/** Apply the saved theme for the currently resolved mode (light or dark). */
export function applyThemeForMode(resolvedMode: ThemeMode | undefined = mode.current): void {
  if (resolvedMode) {
    setTheme(selections[resolvedMode])
    // Ensure mode-watcher's storage stays in sync
    try {
      localStorage.setItem('mode-watcher-theme', selections[resolvedMode])
    }
    catch {
      // Ignore storage errors
    }
  }
}

/** Restore the default mode and theme selections. */
export function resetThemePreferences(): void {
  selections = { ...DEFAULTS }
  setMode('system')
  const resolvedMode = systemPrefersMode.current ?? 'light'
  applyThemeForMode(resolvedMode)
  saveSelections()
}

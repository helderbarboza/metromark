import { mode, setTheme } from 'mode-watcher'

export const LIGHT_THEMES = [
  'one-light',
  'github',
  'solarized-light',
  'tokyo-night-light',
  'catppuccin-latte',
] as const

export const DARK_THEMES = [
  'catppuccin-mocha',
  'one-dark',
  'github-dark',
  'solarized-dark',
  'tokyo-night-dark',
  'catppuccin-macchiato',
  'catppuccin-frappe',
] as const

export type ThemeMode = 'light' | 'dark'
export type LightTheme = (typeof LIGHT_THEMES)[number]
export type DarkTheme = (typeof DARK_THEMES)[number]
export type ThemeChoice = LightTheme | DarkTheme

export interface ThemeSelections {
  light: LightTheme
  dark: DarkTheme
}

const STORAGE_KEY = 'app-theme-selections'
const DEFAULTS: ThemeSelections = {
  light: 'solarized-light',
  dark: 'catppuccin-mocha',
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

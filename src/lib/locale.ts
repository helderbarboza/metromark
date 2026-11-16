import type { Locales } from '$i18n/i18n-types'
import { setLocale as setSvelteLocale } from '$i18n/i18n-svelte'
import { i18nObject, isLocale } from '$i18n/i18n-util'
import { loadAllLocales } from '$i18n/i18n-util.sync'

/** Locales shipped in this build, in display order (base locale first). */
export const APP_LOCALES = ['en', 'de', 'fr', 'es', 'pt'] as const satisfies readonly Locales[]
export type AppLocale = Locales
/** The `language` setting: an explicit locale, or `auto` to infer from the environment. */
export type LanguageSetting = 'auto' | AppLocale
export const LANGUAGE_SETTING_VALUES: readonly string[] = ['auto', ...APP_LOCALES]

export const LANGUAGE_NATIVE_NAMES: Record<AppLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
}

const STORAGE_KEY = 'metromark-language'

function isLanguageSetting(value: unknown): value is LanguageSetting {
  return typeof value === 'string'
    && LANGUAGE_SETTING_VALUES.includes(value)
}

/** Candidate BCP 47 tags from the environment, most preferred first. */
function environmentCandidates(): string[] {
  const candidates: string[] = []
  const nav = globalThis.navigator
  if (nav?.languages !== undefined)
    candidates.push(...nav.languages)
  if (nav?.language)
    candidates.push(nav.language)
  try {
    const resolved = new Intl.DateTimeFormat().resolvedOptions().locale
    if (resolved)
      candidates.push(resolved)
  }
  catch {
    /* Intl is always available in practice; keep the list whatever it holds. */
  }
  return candidates
}

/**
 * Resolve the effective locale for a `language` setting. `auto` (or an
 * unrecognized stored value) infers from the environment: exact match first,
 * then the base language subtag, then English.
 */
export function resolveLocale(setting: string | undefined, candidates?: string[]): AppLocale {
  if (isLanguageSetting(setting) && setting !== 'auto')
    return setting
  const raw = candidates ?? environmentCandidates()
  for (const candidate of raw) {
    const normalized = candidate.trim().toLowerCase()
    if (!normalized)
      continue
    if (isLocale(normalized))
      return normalized
    const base = normalized.split('-')[0]
    if (isLocale(base))
      return base
  }
  return 'en'
}

/** The last persisted `language` setting, for pre-snapshot rendering. Defaults to `auto`. */
export function provisionalLanguageSetting(): LanguageSetting {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isLanguageSetting(stored))
        return stored
    }
  }
  catch {
    /* Storage can be unavailable (private mode, disabled cookies). */
  }
  return 'auto'
}

let activeLocale: AppLocale | null = null

/** The locale currently applied to the app (or the background worker). */
export function getActiveLocale(): AppLocale {
  return activeLocale ?? 'en'
}

interface ApplyOptions {
  /** Persist the setting for pre-snapshot rendering; defaults to true. */
  persist?: boolean
}

/**
 * Apply a `language` setting: resolve it, load the locales, point the Svelte
 * store and module state at it, sync `<html lang>`, and remember it for the
 * next load. Returns the effective locale.
 */
export function applyLocale(setting: LanguageSetting | string | undefined, options: ApplyOptions = {}): AppLocale {
  const resolved = resolveLocale(setting)
  loadAllLocales()
  if (activeLocale !== resolved) {
    activeLocale = resolved
    setSvelteLocale(resolved)
  }
  if (typeof document !== 'undefined')
    document.documentElement.lang = resolved
  if (options.persist !== false) {
    try {
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(STORAGE_KEY, isLanguageSetting(setting) ? setting : 'auto')
    }
    catch {
      /* Storage can be unavailable; the setting itself persists through the coordinator. */
    }
  }
  return resolved
}

/** Translation functions for non-Svelte modules; re-read at every call. */
export function getT() {
  if (activeLocale === null) {
    loadAllLocales()
    activeLocale = 'en'
  }
  return i18nObject(activeLocale)
}

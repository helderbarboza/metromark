import { createPreviewClient } from '$lib/adapters/preview'
import { loadSettings } from '$lib/config'
import { DEMO_PROFILES, isDemoProfileId } from '$lib/demo-profiles'
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from '$lib/themes'
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

const TREE_KEY = 'metromark.preview.bookmarks.v1'
const DATA_KEY = 'metromark.preview.presentation.v1'
const MODE_KEY = 'mode-watcher-mode'
const THEME_KEY = 'mode-watcher-theme'
const THEME_SELECTIONS_KEY = 'app-theme-selections'
const RELOAD_KEY = 'metromark.preview.rebooted'

/**
 * Seed one seeded profile into an already-wiped storage. Best effort:
 * an unknown profile id or a storage error leaves the built-in demo defaults
 * in place. The caller always reloads when the wipe succeeded, so the
 * pre-paint script and every import-time store read the seeded storage.
 */
function seedProfile() {
  try {
    const requested = new URLSearchParams(window.location.search).get('profile')
    if (!isDemoProfileId(requested)) {
      if (requested !== null && requested !== '')
        console.warn(`Unknown demo profile "${requested}"; showing the default demo.`)
      return
    }
    const profile = DEMO_PROFILES[requested]
    localStorage.setItem(TREE_KEY, JSON.stringify(profile.tree()))
    localStorage.setItem(DATA_KEY, JSON.stringify(profile.data()))
    localStorage.setItem(MODE_KEY, profile.mode)
    localStorage.setItem(THEME_KEY, profile.theme)
    localStorage.setItem(THEME_SELECTIONS_KEY, JSON.stringify({
      light: profile.mode === 'light'
        ? profile.theme
        : DEFAULT_LIGHT_THEME,
      dark: profile.mode === 'dark'
        ? profile.theme
        : DEFAULT_DARK_THEME,
    }))
  }
  catch (error) {
    console.warn('Failed to seed demo profile; showing the default demo.', error)
  }
}

/**
 * The demo starts clean on every visit: localStorage is wiped and the
 * requested profile is seeded, then the page reloads once so the pre-paint
 * script and the import-time stores read the seeded storage. A sessionStorage
 * marker breaks the reload into exactly one extra navigation per visit.
 * Returns true when a reload is pending and the app must not mount.
 */
function ensureFreshBoot(): boolean {
  let bootToken = 'default'
  try {
    bootToken = new URLSearchParams(window.location.search).get('profile') ?? 'default'
  }
  catch {
    // An unreadable URL falls back to the default boot token.
  }
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === bootToken) {
      sessionStorage.removeItem(RELOAD_KEY)
      return false
    }
    localStorage.clear()
    sessionStorage.setItem(RELOAD_KEY, bootToken)
  }
  catch {
    // sessionStorage or localStorage unavailable: mount anyway.
    return false
  }
  seedProfile()
  window.location.reload()
  return true
}

const reloadPending = ensureFreshBoot()

if (!reloadPending) {
  const settings = loadSettings()
  // Suppress the preview-only "Demo" badge for published captures (`&clean=1`).
  const hideDemoBadge = new URLSearchParams(window.location.search).get('clean') === '1'
  mount(App, {
    target: document.getElementById('app')!,
    props: {
      client: createPreviewClient(settings),
      hideDemoBadge,
    },
  })
}

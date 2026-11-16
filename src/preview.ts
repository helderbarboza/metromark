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
const PROFILE_KEY = 'metromark.preview.profile'

/**
 * Seed one seeded profile before the app mounts. Runs once per profile switch
 * (the marker key records the last seeded profile), so repeat visits keep any
 * local edits while switching profiles reseeds from scratch.
 */
function seedProfile() {
  try {
    const requested = new URLSearchParams(window.location.search).get('profile')
    if (!isDemoProfileId(requested)) {
      if (requested !== null && requested !== '')
        console.warn(`Unknown demo profile "${requested}"; showing the default demo.`)
      return
    }
    if (localStorage.getItem(PROFILE_KEY) === requested)
      return
    const profile = DEMO_PROFILES[requested]
    localStorage.setItem(TREE_KEY, JSON.stringify(profile.tree()))
    localStorage.setItem(DATA_KEY, JSON.stringify(profile.data()))
    localStorage.setItem(MODE_KEY, profile.mode)
    localStorage.setItem(THEME_KEY, profile.theme)
    localStorage.setItem(THEME_SELECTIONS_KEY, JSON.stringify({
      light: profile.mode === 'light' ? profile.theme : DEFAULT_LIGHT_THEME,
      dark: profile.mode === 'dark' ? profile.theme : DEFAULT_DARK_THEME,
    }))
    localStorage.setItem(PROFILE_KEY, profile.id)
  }
  catch (error) {
    console.warn('Failed to seed demo profile; showing the default demo.', error)
  }
}

seedProfile()

const settings = loadSettings()
// Suppress the preview-only "Demo" badge for published captures (`&clean=1`).
const hideDemoBadge = new URLSearchParams(window.location.search).get('clean') === '1'
mount(App, { target: document.getElementById('app')!, props: { client: createPreviewClient(settings), hideDemoBadge } })

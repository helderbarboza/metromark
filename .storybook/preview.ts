import type { Preview } from '@storybook/svelte'
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, getTheme, THEMES } from '../src/lib/themes.js'
import steamFaviconUrl from './steam-favicon.ico?url'
import ThemeDecorator from './ThemeDecorator.svelte'
import '../src/styles.css'

// Storybook has no browser favicon cache (the web preview has no extension
// runtime), so point tile icons at one fixed sample favicon. The normal
// conversion pipeline still tints it and falls back to the bundled SVG if
// loading fails. Source: https://store.steampowered.com/favicon.ico
const storybookFavicon = new URL(steamFaviconUrl, window.location.href).href
window.chrome = {
  ...window.chrome,
  runtime: { getURL: () => storybookFavicon },
}

// Storybook's docs page renders the story inside a white .sbdocs-preview card
// whose inner canvas (.docs-story) stays transparent and shows through. The
// built-in Backgrounds addon used to paint that inner canvas with the active
// theme. Without the addon, theme background vanishes in docs mode — inject a
// small rule here instead (mirrors the addon's docs-mode behavior).
if (typeof document !== 'undefined' && !document.getElementById('storybook-theme-canvas')) {
  const style = document.createElement('style')
  style.id = 'storybook-theme-canvas'
  style.textContent = '.docs-story { background: var(--background) !important; }'
  document.head.appendChild(style)
}

const preview: Preview = {
  parameters: {
    layout: 'centered',
    a11y: { test: 'error', config: { rules: [{ id: 'region', enabled: false }] } },
  },
  globalTypes: {
    theme: {
      description: 'Metro theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: THEMES.map(t => ({ value: t.name, title: t.label })),
      },
    },
  },
  initialGlobals: { theme: 'catppuccin-mocha' },
  // Applies the toolbar-selected theme to the story document. Svelte CSF
  // renders this as a component wrapper (see ThemeDecorator.svelte), and the
  // theme is applied in $effect so it runs on mount and on global changes.
  // Composes with story-level `globals: { theme: … }` pins (they just win
  // the selector). Every story in this repo is themed through this decorator —
  // there is no per-fixture theme plumbing anymore.
  decorators: [(StoryFn, context) => {
    const theme = typeof context.globals.theme === 'string' ? context.globals.theme : DEFAULT_DARK_THEME
    const entry = getTheme(theme) ?? getTheme(DEFAULT_DARK_THEME)
    // Seed mode-watcher's persisted selection so any app that reads
    // theme directly from storage opens in the selected theme. Written here
    // (not at module scope) so each story gets its own coherent state;
    // portable stories share one browser and one localStorage.
    if (entry && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('mode-watcher-mode', entry.mode)
        window.localStorage.setItem('mode-watcher-theme', entry.name)
        window.localStorage.setItem(
          'app-theme-selections',
          JSON.stringify({ light: DEFAULT_LIGHT_THEME, dark: entry.name }),
        )
      }
      catch {
        // Storage unavailable — the decorator still applies the DOM attributes.
      }
    }
    return { Component: ThemeDecorator, props: { theme, story: StoryFn() } }
  }],
}
export default preview

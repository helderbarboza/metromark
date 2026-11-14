// FOUC prevention for mode-watcher. Extension-page CSP blocks the inline
// script ModeWatcher would otherwise inject, so the newtab page loads this
// static file (copied from public/ by Vite and WXT) before first paint.
// Storage keys and defaults mirror mode-watcher's own conventions.
;(function () {
  // theme-color per theme: the theme base00 (background) hex.
  // BEGIN GENERATED THEME COLORS - do not edit; run `npm run generate:themes` after editing src/lib/themes.ts
  var DEFAULT_LIGHT_THEME = 'catppuccin-latte'
  var DEFAULT_DARK_THEME = 'catppuccin-mocha'
  var THEME_COLORS = {
    'ayu-light': '#f8f9fa',
    'catppuccin-latte': '#eff1f5',
    'github': '#ffffff',
    'one-light': '#fafafa',
    'solarized-light': '#fdf6e3',
    'tokyo-night-light': '#d5d6db',
    'ayu-dark': '#0b0e14',
    'ayu-mirage': '#1f2430',
    'berlin': '#000000',
    'catppuccin-frappe': '#303446',
    'catppuccin-macchiato': '#24273a',
    'catppuccin-mocha': '#1e1e2e',
    'dracula': '#282a36',
    'github-dark': '#0d1117',
    'heetch': '#190134',
    'material': '#263238',
    'one-dark': '#282c34',
    'solarized-dark': '#002b36',
    'tokyo-night-moon': '#222436',
    'vice': '#17191e',
    'windows-10': '#0c0c0c',
    'yesterday': '#1d1f21',
    'yesterday-night': '#343d46',
  }
  // END GENERATED THEME COLORS
  var mode = localStorage.getItem('mode-watcher-mode')
  if (mode !== 'light' && mode !== 'dark' && mode !== 'system')
    mode = 'system'
  var light = mode === 'light' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
  var theme = localStorage.getItem('mode-watcher-theme')
  try {
    var saved = JSON.parse(localStorage.getItem('app-theme-selections') || 'null')
    var savedTheme = saved && saved[light ? 'light' : 'dark']
    if (typeof savedTheme === 'string')
      theme = savedTheme
  }
  catch {
    // A malformed selection falls back to mode-watcher's stored theme.
  }
  if (typeof theme !== 'string' || !Object.prototype.hasOwnProperty.call(THEME_COLORS, theme))
    theme = light ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME
  var root = document.documentElement
  if (light)
    root.classList.remove('dark')
  else
    root.classList.add('dark')
  root.style.colorScheme = light ? 'light' : 'dark'
  root.setAttribute('data-theme', theme)
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta)
    meta.setAttribute('content', THEME_COLORS[theme])
})()

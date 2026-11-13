// FOUC prevention for mode-watcher. Extension-page CSP blocks the inline
// script ModeWatcher would otherwise inject, so the newtab page loads this
// static file (copied from public/ by Vite and WXT) before first paint.
// Storage keys and defaults mirror mode-watcher's own conventions.
;(function () {
  // theme-color per theme: the theme base00 (background) hex.
  var THEME_COLORS = {
    'catppuccin-latte': '#eff1f5',
    'catppuccin-frappe': '#303446',
    'catppuccin-macchiato': '#24273a',
    'catppuccin-mocha': '#1e1e2e',
    'github': '#ffffff',
    'github-dark': '#0d1117',
    'one-light': '#fafafa',
    'one-dark': '#282c34',
    'solarized-light': '#fdf6e3',
    'solarized-dark': '#002b36',
    'tokyo-night-light': '#d5d6db',
    'tokyo-night-moon': '#222436',
  }
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
    theme = light ? 'catppuccin-latte' : 'catppuccin-mocha'
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

// FOUC prevention for mode-watcher. Extension-page CSP blocks the inline
// script ModeWatcher would otherwise inject, so the newtab page loads this
// static file (copied from public/ by Vite and WXT) before first paint.
// Storage keys and defaults mirror mode-watcher's own conventions.
;(function () {
  var THEME_COLORS = {
    'fluent-light': { dark: '#000000', light: '#ffffff' },
    'fluent-dark': { dark: '#000000', light: '#ffffff' },
    'metro-light': { dark: '#1F1F1F', light: '#F3F3F3' },
    'metro-dark': { dark: '#1F1F1F', light: '#F3F3F3' },
    midnight: { dark: '#101216', light: '#eceef1' },
    dusk: { dark: '#201b2b', light: '#efeaf2' },
    forest: { dark: '#14201c', light: '#e9efea' },
    paper: { dark: '#1e1f22', light: '#eeece8' },
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
  if (typeof theme !== 'string' || theme === '')
    theme = light ? 'fluent-light' : 'fluent-dark'
  var colors = THEME_COLORS[theme]
  var color = colors
    ? colors[light ? 'light' : 'dark']
    : (light ? '#ffffff' : '#000000')
  var root = document.documentElement
  if (light)
    root.classList.remove('dark')
  else
    root.classList.add('dark')
  root.style.colorScheme = light ? 'light' : 'dark'
  root.setAttribute('data-theme', theme)
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta)
    meta.setAttribute('content', color)
})()

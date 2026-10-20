// FOUC prevention for mode-watcher. Extension-page CSP blocks the inline
// script ModeWatcher would otherwise inject, so the newtab page loads this
// static file (copied from public/ by Vite and WXT) before first paint.
// Storage keys and defaults mirror mode-watcher's own conventions.
;(function () {
  var THEME_COLORS = {
    midnight: { dark: '#101216', light: '#eceef1' },
    dusk: { dark: '#201b2b', light: '#efeaf2' },
    forest: { dark: '#14201c', light: '#e9efea' },
    paper: { dark: '#1e1f22', light: '#eeece8' },
  }
  var mode = localStorage.getItem('mode-watcher-mode')
  if (mode !== 'light' && mode !== 'dark' && mode !== 'system')
    mode = 'system'
  var theme = localStorage.getItem('mode-watcher-theme')
  if (!Object.prototype.hasOwnProperty.call(THEME_COLORS, theme))
    theme = 'midnight'
  var light = mode === 'light' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
  var root = document.documentElement
  if (light)
    root.classList.remove('dark')
  else
    root.classList.add('dark')
  root.style.colorScheme = light ? 'light' : 'dark'
  root.setAttribute('data-theme', theme)
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta)
    meta.setAttribute('content', THEME_COLORS[theme][light ? 'light' : 'dark'])
})()

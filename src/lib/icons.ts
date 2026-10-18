import { icons as starter } from './starter-icons'

const svg = (body: string, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`
const stroke = (body: string) => svg(`<g stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${body}</g>`)
// UI chrome icons plus the single generic globe used as the tile favicon
// fallback. Bookmark tiles otherwise render only real favicons.
export const icons: Record<string, string> = {
  globe: starter.browser,
  search: stroke('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  close: stroke('<path d="m6 6 12 12M6 18 18 6"/>'),
  arrow: stroke('<path d="M6 18 18 6M6 6h12v12"/>'),
  chevron: stroke('<path d="m9 5 7 7-7 7"/>'),
  back: stroke('<path d="m15 5-7 7 7 7"/>'),
  more: svg('<g fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></g>'),
  check: stroke('<path d="m5 12 4 4L19 6"/>'),
  folder: stroke('<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>'),
  edit: stroke('<path d="m15 4 5 5M4 20l5-1L20 8a2.1 2.1 0 0 0-4-4L5 15z"/>'),
  trash: stroke('<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>'),
  copy: stroke('<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H3v13h5"/>'),
  arrange: stroke('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M17.5 14v7M14 17.5h7"/>'),
  lock: stroke('<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
  undo: stroke('<path d="M4 10h10a6 6 0 0 1 0 12M4 10l5-5M4 10l5 5"/>'),
  external: stroke('<path d="M15 3h6v6M21 3l-9 9M11 5H4v15h15v-7"/>'),
  reset: stroke('<path d="M4 11a8 8 0 1 1 1 6M4 4v7h7"/>'),
  desktop: starter.desktop,
  settings: starter.settings,
}
export const globeIcon = icons.globe
export const getIcon = (name: string) => icons[name] ?? icons.globe

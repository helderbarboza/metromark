import { icons as starter } from './starter-icons';

const svg = (body: string, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const stroke = (body: string) => svg(`<g stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${body}</g>`);
export const icons: Record<string, string> = {
  ...starter,
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
  link: stroke('<path d="m10 14 4-4M9 16l-2 2a4 4 0 0 1-5.6-5.6l4-4a4 4 0 0 1 5.6 0M15 8l2-2a4 4 0 0 1 5.6 5.6l-4 4a4 4 0 0 1-5.6 0"/>'),
  copy: stroke('<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H3v13h5"/>'),
  arrange: stroke('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M17.5 14v7M14 17.5h7"/>'),
  lock: stroke('<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
  undo: stroke('<path d="M4 10h10a6 6 0 0 1 0 12M4 10l5-5M4 10l5 5"/>'),
  mouse: stroke('<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 9h12"/>'),
  external: stroke('<path d="M15 3h6v6M21 3l-9 9M11 5H4v15h15v-7"/>'),
  reset: stroke('<path d="M4 11a8 8 0 1 1 1 6M4 4v7h7"/>'),
  figma: svg('<g fill="currentColor"><path d="M6 2h6v7H6a3.5 3.5 0 0 1 0-7Z"/><path d="M12 2h3a3.5 3.5 0 0 1 0 7h-3Z" opacity=".7"/><path d="M6 9h6v7H6a3.5 3.5 0 0 1 0-7Z" opacity=".8"/><circle cx="15.5" cy="12.5" r="3.5" opacity=".6"/><path d="M6 16h6v3.5A3.5 3.5 0 1 1 6 16Z" opacity=".9"/></g>'),
  github: svg('<path fill="currentColor" d="M12 .7a11.6 11.6 0 0 0-3.7 22.6c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.6 1.3 3.3 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.2 11.2 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.8 1.1.8 2.2v3.4c0 .4.2.7.8.6A11.6 11.6 0 0 0 12 .7Z"/>'),
  notion: svg('<path d="M4 3h15l2 3v15H4L2 18V5z" stroke="currentColor" stroke-width="1.5"/><path d="M2 5h16l3 1M4 7h14v12H4z" stroke="currentColor"/><path d="M7 9h3l5 7V9h2v1h-1v8h-2l-5-7v6h1v1H7v-1h1v-7H7z" fill="currentColor"/>'),
  linear: svg('<circle cx="12" cy="12" r="10" fill="currentColor"/><g stroke="var(--tile-color, #6556b6)" stroke-width="1.8"><path d="m2 9 13 13M3 6l15 15M5 3l16 16M9 2l13 13"/></g>'),
  slack: svg('<g fill="currentColor"><rect x="9" y="1" width="4" height="10" rx="2"/><rect x="1" y="9" width="10" height="4" rx="2"/><rect x="13" y="13" width="10" height="4" rx="2"/><rect x="13" y="13" width="4" height="10" rx="2"/><rect x="15" y="1" width="4" height="4" rx="2"/><rect x="1" y="15" width="4" height="4" rx="2"/><rect x="19" y="7" width="4" height="4" rx="2"/><rect x="7" y="19" width="4" height="4" rx="2"/><rect x="13" y="7" width="10" height="4" rx="2"/><rect x="7" y="13" width="4" height="10" rx="2"/></g>'),
  drive: svg('<path fill="currentColor" d="M8 2h8l8 15-4 6H4l-4-6Z"/><path fill="var(--tile-color, #467953)" d="m12 7 5 9H7Z"/>'),
  gmail: stroke('<path d="M3 19V5l9 7 9-7v14M3 5l9 7 9-7M3 19h18"/>'),
  calendar: stroke('<rect x="3" y="4" width="18" height="18" rx="1"/><path d="M3 9h18M8 2v5M16 2v5"/><path d="M8 13h4v3H8M8 19h4v-3M15 13v6"/>'),
  meet: svg('<path fill="currentColor" d="M3 4h11a2 2 0 0 1 2 2v3l6-4v14l-6-4v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>'),
  arena: stroke('<path d="M3 3h7v18H3zM14 3h7v18h-7zM10 12h4"/>'),
  dribbble: stroke('<circle cx="12" cy="12" r="10"/><path d="M6 4c6 6 8 12 9 18M2 10c9 2 15-2 18-5M4 19c3-8 11-10 18-7"/>'),
  pinterest: svg('<path fill="currentColor" d="M12 1a11 11 0 0 0-4 21c-.1-1.7 0-3.3.4-4.8l1.5-6.2s-.4-.7-.4-1.8c0-1.7 1-3 2.3-3 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.8-1.1 4.4-.3 1.3.6 2.3 1.9 2.3 2.3 0 4-2.4 4-5.8 0-3-2.1-5-5.1-5-3.5 0-5.6 2.6-5.6 5.3 0 1 .4 2.1.9 2.7l-.3 1.1c-.1.3-.3.4-.6.2-1.5-.7-2.4-2.7-2.4-4.3 0-3.5 2.5-6.8 7.2-6.8 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 7-5.7 7-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.2 1-.9 2.1-1.4 3a11 11 0 1 0 3.4-21Z"/>'),
  spotify: svg('<circle cx="12" cy="12" r="11" fill="currentColor"/><g stroke="var(--tile-color, #348763)" stroke-width="1.7" stroke-linecap="round"><path d="M5.5 9c5-1.5 9-1 13 1M6 13c4-1.2 8-1 11 1M7 17c3-1 6-1 9 .5"/></g>'),
  youtube: svg('<rect x="1" y="5" width="22" height="15" rx="4" fill="currentColor"/><path d="m10 9 6 3.5-6 3.5" fill="var(--tile-color, #ad4a44)"/>'),
  globe: starter.browser,
  book: stroke('<path d="M12 5C8 2 4 2 2 3v16c3-1 6-1 10 2 4-3 7-3 10-2V3c-3-1-7-1-10 2v16"/>'),
};
export const iconChoices = ['globe', 'link', 'book', 'mail', 'calendar', 'folder', 'photos', 'desktop', 'music', 'video', 'settings', 'figma', 'github', 'notion', 'linear', 'slack', 'drive', 'arena'];
export const getIcon = (name: string) => icons[name] ?? icons.globe;

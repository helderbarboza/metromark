// Starter set of flat, white, Metro-style glyphs (24×24, stroked).
// Use as `icon: icons.mail` in a MetroTileDef, or pass any SVG markup string.

const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const icons = {
  mail: svg(`<rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/>`),
  calendar: svg(`<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>`),
  people: svg(`<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><circle cx="17" cy="9" r="2.3"/><path d="M16 14.5c3 0 5 1.5 5 4.5"/>`),
  weather: svg(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  photos: svg(`<rect x="3" y="5" width="18" height="14"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 8"/>`),
  store: svg(`<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>`),
  browser: svg(`<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>`),
  desktop: svg(`<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>`),
  maps: svg(`<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>`),
  camera: svg(`<rect x="3" y="7" width="18" height="13"/><circle cx="12" cy="13.5" r="3.8"/><path d="M8 7l2-3h4l2 3"/>`),
  settings: svg(`<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>`),
  alarms: svg(`<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M5 4L3 6M19 4l2 2"/>`),
  calc: svg(`<rect x="5" y="3" width="14" height="18"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2"/>`),
  news: svg(`<rect x="3" y="5" width="18" height="14"/><path d="M6 9h6M6 12h12M6 15h12M14 8h4v2h-4z"/>`),
  music: svg(`<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>`),
  video: svg(`<rect x="3" y="6" width="13" height="12"/><path d="M16 10l5-3v10l-5-3z"/>`),
  games: svg(`<rect x="2" y="7" width="20" height="11" rx="5.5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r=".6"/><circle cx="17.5" cy="13.5" r=".6"/>`),
  sports: svg(`<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>`),
  finance: svg(`<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>`),
  cloud: svg(`<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z"/>`),
} as const;

export type IconName = keyof typeof icons;

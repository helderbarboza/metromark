// Minimal Metro-style glyphs still in use: the generic globe tile fallback
// plus UI chrome icons that live in `icons.ts` via this registry.

const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const icons = {
  browser: svg(`<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>`),
  desktop: svg(`<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>`),
  settings: svg(`<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>`),
} as const;

export type IconName = keyof typeof icons;

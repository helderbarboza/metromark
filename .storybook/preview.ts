import type { Preview } from '@storybook/svelte'
import steamFaviconUrl from './steam-favicon.ico?url'
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

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      options: {
        'catppuccin-mocha': { name: 'Catppuccin Mocha (Dark)', value: '#1e1e2e' },
        'catppuccin-latte': { name: 'Catppuccin Latte (Light)', value: '#eff1f5' },
        'one-dark': { name: 'One Dark', value: '#282c34' },
        'one-light': { name: 'One Light', value: '#fafafa' },
        'github-dark': { name: 'GitHub Dark', value: '#0d1117' },
        'github': { name: 'GitHub Light', value: '#ffffff' },
        'solarized-dark': { name: 'Solarized Dark', value: '#002b36' },
        'solarized-light': { name: 'Solarized Light', value: '#fdf6e3' },
        'tokyo-night-dark': { name: 'Tokyo Night Dark', value: '#1a1b26' },
        'tokyo-night-light': { name: 'Tokyo Night Light', value: '#d5d6db' },
        'catppuccin-macchiato': { name: 'Catppuccin Macchiato', value: '#24273a' },
        'catppuccin-frappe': { name: 'Catppuccin Frappe', value: '#303446' },
      },
    },
    a11y: { test: 'error', config: { rules: [{ id: 'region', enabled: false }] } },
  },
  initialGlobals: { backgrounds: { value: 'catppuccin-mocha' } },
}
export default preview

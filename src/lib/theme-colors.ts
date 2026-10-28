import { foreground } from '$lib/color.js'

const FALLBACK_PALETTE = ['#af572f', '#6559b4', '#32767d', '#4b6eaa', '#767148', '#9b526b', '#53774f', '#a14e47']
const ACCENT_KEYS = ['base08', 'base09', 'base0A', 'base0B', 'base0C', 'base0D', 'base0E', 'base0F']

export function getThemeAccentColors(): string[] {
  if (typeof document === 'undefined')
    return FALLBACK_PALETTE
  const styles = getComputedStyle(document.documentElement)
  return ACCENT_KEYS.map((key, i) => styles.getPropertyValue(`--${key}`).trim() || FALLBACK_PALETTE[i])
}

function isValidHexColor(value: string): boolean {
  const hex = value.trim()
  return /^#?[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(hex)
}

function normalizeHexColor(value: string): string {
  const hex = value.trim().replace('#', '')
  return hex.length === 3
    ? `#${hex.split('').map(c => c + c).join('')}`
    : `#${hex}`
}

export function resolveTileColors(tile: { color?: string, colorIndex: number }): { bg: string, fg: number } {
  const themeColors = getThemeAccentColors()
  const customColor = tile.color?.trim()
  const bg = (customColor !== undefined && customColor !== '' && isValidHexColor(customColor))
    ? normalizeHexColor(customColor)
    : themeColors[tile.colorIndex] ?? '#000000'
  const fg = foreground(bg)
  return { bg, fg }
}

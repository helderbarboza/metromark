const FALLBACK_PALETTE = ['#af572f', '#6559b4', '#32767d', '#4b6eaa', '#767148', '#9b526b', '#53774f', '#a14e47']
const ACCENT_KEYS = ['base08', 'base09', 'base0A', 'base0B', 'base0C', 'base0D', 'base0E', 'base0F']

export function getThemeAccentColors(): string[] {
  if (typeof document === 'undefined')
    return FALLBACK_PALETTE
  const styles = getComputedStyle(document.documentElement)
  return ACCENT_KEYS.map((key, i) => styles.getPropertyValue(`--${key}`).trim() || FALLBACK_PALETTE[i])
}

export function foreground(bgColor: string) {
  let r: number
  let g: number
  let b: number

  if (Array.isArray(bgColor)) {
    [r, g, b] = bgColor
  }
  else {
    let hex = bgColor.replace('#', '')
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    r = Number.parseInt(hex.substring(0, 2), 16)
    g = Number.parseInt(hex.substring(2, 4), 16)
    b = Number.parseInt(hex.substring(4, 6), 16)
  }

  r /= 255
  g /= 255
  b /= 255

  const linearize = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

  const R = linearize(r)
  const G = linearize(g)
  const B = linearize(b)

  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B

  return luminance > 0.179 ? 0 : 1
}

export function resolveTileColors(tile: { color?: string, colorIndex: number }): { bg: string, fg: number } {
  const themeColors = getThemeAccentColors()
  const bg = tile.color ?? themeColors[tile.colorIndex] ?? '#000000'
  const fg = foreground(bg)
  return { bg, fg }
}

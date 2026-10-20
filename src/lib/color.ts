export function foreground(bgColor: string) {
  // Accepts "#RRGGBB", "RRGGBB", "#RGB", or [r, g, b] (0-255)
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

  // Normalize to 0-1
  r /= 255
  g /= 255
  b /= 255

  // Linearize sRGB channels (gamma correction)
  const linearize = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

  const R = linearize(r)
  const G = linearize(g)
  const B = linearize(b)

  // Relative luminance (WCAG formula)
  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B

  // Threshold derived from equal-contrast condition
  return luminance > 0.179 ? 0 : 1 // 0 = black, 1 = white
}

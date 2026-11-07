export function foreground(bgColor: string | number[]): number {
  let r: number
  let g: number
  let b: number

  if (Array.isArray(bgColor)) {
    [r, g, b] = bgColor
  }
  else if (typeof bgColor === 'string') {
    const trimmed = bgColor.trim()
    if (trimmed.length === 0) {
      return 0
    }
    // Parse rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
    if (rgbMatch) {
      r = Number.parseInt(rgbMatch[1], 10)
      g = Number.parseInt(rgbMatch[2], 10)
      b = Number.parseInt(rgbMatch[3], 10)
    }
    else {
      const hex = trimmed.replace('#', '')
      if (hex.length === 0 || !/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(hex)) {
        return 0
      }
      if (hex.length === 3) {
        r = Number.parseInt(hex[0] + hex[0], 16)
        g = Number.parseInt(hex[1] + hex[1], 16)
        b = Number.parseInt(hex[2] + hex[2], 16)
      }
      else {
        r = Number.parseInt(hex.substring(0, 2), 16)
        g = Number.parseInt(hex.substring(2, 4), 16)
        b = Number.parseInt(hex.substring(4, 6), 16)
      }
    }
  }
  else {
    return 0
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

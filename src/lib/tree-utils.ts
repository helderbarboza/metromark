/** Stable accent index from a string (domains, folder ids). 0-7. */
export function hashColorIndex(value: string): number {
  const hash = [...value].reduce((n, letter) => (n * 31 + letter.charCodeAt(0)) >>> 0, 0)
  return hash % 8
}

export function website(url: string): { domain: string, colorIndex: number } {
  let domain: string
  try {
    domain = new URL(url).hostname.replace(/^www\./, '') || new URL(url).protocol.replace(':', '')
  }
  catch {
    domain = 'bookmark'
  }
  return { domain, colorIndex: hashColorIndex(domain) }
}

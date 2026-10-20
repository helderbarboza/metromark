export function website(url: string): { domain: string, colorIndex: number } {
  let domain: string
  try {
    domain = new URL(url).hostname.replace(/^www\./, '') || new URL(url).protocol.replace(':', '')
  }
  catch {
    domain = 'bookmark'
  }
  const hash = [...domain].reduce((n, letter) => (n * 31 + letter.charCodeAt(0)) >>> 0, 0)
  return { domain, colorIndex: hash % 8 }
}

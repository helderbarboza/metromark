export function validateUrl(value: string): string {
  const url = value.trim()
  if (!url)
    throw new Error('Enter a website address.')
  let parsed: URL
  try {
    parsed = new URL(url)
  }
  catch {
    throw new Error('Use a complete address, such as https://example.com.')
  }
  if (['javascript:', 'data:', 'vbscript:', 'blob:'].includes(parsed.protocol)) {
    throw new Error('Executable and data URLs cannot be launched from this privileged extension page.')
  }
  if (!['http:', 'https:', 'file:', 'ftp:', 'mailto:', 'tel:', 'chrome:', 'about:', 'moz-extension:', 'chrome-extension:'].includes(parsed.protocol)) {
    throw new Error('This address uses an unsupported URL scheme.')
  }
  return url
}

export function safeUrl(url: string): string {
  try {
    return validateUrl(url)
  }
  catch {
    return '#'
  }
}

export function isFaviconEligible(pageUrl: string): boolean {
  try {
    const parsed = new URL(pageUrl.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }
  catch {
    return false
  }
}

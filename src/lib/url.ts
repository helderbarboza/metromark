import { getT } from '$lib/locale'

export function validateUrl(value: string): string {
  const url = value.trim()
  if (!url)
    throw new Error(getT().urlErrors.empty())
  let parsed: URL
  try {
    parsed = new URL(url)
  }
  catch {
    throw new Error(getT().urlErrors.invalid())
  }
  if (['javascript:', 'data:', 'vbscript:', 'blob:'].includes(parsed.protocol)) {
    throw new Error(getT().urlErrors.executable())
  }
  if (!['http:', 'https:', 'file:', 'ftp:', 'mailto:', 'tel:', 'chrome:', 'about:', 'moz-extension:', 'chrome-extension:'].includes(parsed.protocol)) {
    throw new Error(getT().urlErrors.unsupportedScheme())
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

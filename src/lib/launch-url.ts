/**
 * Launch-time URL policy. Bookmark addresses stay verbatim in the browser tree;
 * this guard decides whether an address may be opened. It uses a denylist on
 * purpose: custom protocol handlers and future schemes must keep working.
 */

export type LaunchUrlCheck
  = | { ok: true, url: string }
    | { ok: false, reason: 'empty' | 'unsafe-scheme' }

/** Schemes that can execute script or carry a document into the page. */
const BLOCKED_SCHEMES: readonly string[] = [
  'javascript:',
  'data:',
  'vbscript:',
  'blob:',
  'filesystem:',
]

/**
 * URL input preprocessing drops tabs, newlines and other C0 controls before
 * scheme detection. `java\nscript:` is still `javascript:` to the browser.
 * Filter by code point so the check does not need a control-character regex.
 */
function stripIgnoredCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0
      return code > 0x20 && code !== 0x7F
    })
    .join('')
}

export function inspectLaunchUrl(raw: string): LaunchUrlCheck {
  const url = raw.trim()
  if (!url)
    return { ok: false, reason: 'empty' }

  const normalized = stripIgnoredCharacters(url).toLowerCase()
  if (BLOCKED_SCHEMES.some(scheme => normalized.startsWith(scheme)))
    return { ok: false, reason: 'unsafe-scheme' }

  try {
    const parsed = new URL(url)
    if (BLOCKED_SCHEMES.includes(parsed.protocol))
      return { ok: false, reason: 'unsafe-scheme' }
  }
  catch {
    // A relative or unparseable address cannot carry a blocked scheme after
    // the normalized check above, so it stays usable.
  }

  return { ok: true, url }
}

import { inspectLaunchUrl } from '$lib/launch-url'
import { describe, expect, it } from 'vitest'

describe('inspectLaunchUrl', () => {
  const allowed = [
    'https://example.com/path?a=1#b',
    'http://example.com',
    'mailto:someone@example.com',
    'tel:+15551234',
    'file:///home/user/notes.html',
    'ftp://example.com/file',
    'about:blank',
    'chrome://settings',
    'slack://channel?id=C1',
    'obsidian://open?vault=Notes',
    'books/local.html',
    'https://example.com/#javascript:alert(1)',
  ]

  it.each(allowed)('allows %s', (value) => {
    expect(inspectLaunchUrl(value)).toEqual({ ok: true, url: value })
  })

  it('trims the address without rewriting it', () => {
    expect(inspectLaunchUrl('  obsidian://open?vault=Notes  ')).toEqual({
      ok: true,
      url: 'obsidian://open?vault=Notes',
    })
  })

  const blocked = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    'java\u0000script:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:image/png;base64,AAAA',
    'vbscript:msgbox(1)',
    'blob:https://example.com/uuid',
    'filesystem:https://example.com/tmp/a.txt',
  ]

  it.each(blocked)('blocks %s', (value) => {
    expect(inspectLaunchUrl(value)).toEqual({ ok: false, reason: 'unsafe-scheme' })
  })

  it.each(['', '   ', '\t\n'])('blocks an empty address', (value) => {
    expect(inspectLaunchUrl(value)).toEqual({ ok: false, reason: 'empty' })
  })

  it('allows an address the URL parser cannot read', () => {
    expect(inspectLaunchUrl('not a complete address')).toEqual({
      ok: true,
      url: 'not a complete address',
    })
  })
})

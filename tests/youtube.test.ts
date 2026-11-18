import { parseYouTubeVideoId, validateYoutubeUrl } from '$lib/youtube'
import { describe, expect, it } from 'vitest'

const ID = 'dQw4w9WgXcQ'

describe('parseYouTubeVideoId', () => {
  it('accepts watch URLs', () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(parseYouTubeVideoId(`https://youtube.com/watch?v=${ID}&t=42s`)).toBe(ID)
    expect(parseYouTubeVideoId(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(parseYouTubeVideoId(`http://www.youtube.com/watch?v=${ID}`)).toBe(ID)
  })

  it('accepts youtu.be URLs', () => {
    expect(parseYouTubeVideoId(`https://youtu.be/${ID}`)).toBe(ID)
    expect(parseYouTubeVideoId(`https://youtu.be/${ID}?t=42`)).toBe(ID)
  })

  it('accepts shorts, embed, live and /v/ URLs', () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
    expect(parseYouTubeVideoId(`https://www.youtube.com/embed/${ID}`)).toBe(ID)
    expect(parseYouTubeVideoId(`https://www.youtube.com/live/${ID}`)).toBe(ID)
    expect(parseYouTubeVideoId(`https://www.youtube.com/v/${ID}`)).toBe(ID)
  })

  it('rejects non-YouTube and unsafe addresses', () => {
    expect(parseYouTubeVideoId('')).toBeNull()
    expect(parseYouTubeVideoId('not a url')).toBeNull()
    expect(parseYouTubeVideoId('javascript:alert(1)')).toBeNull()
    expect(parseYouTubeVideoId(`https://example.com/watch?v=${ID}`)).toBeNull()
    expect(parseYouTubeVideoId(`https://www.youtube.com.evil.com/watch?v=${ID}`)).toBeNull()
    expect(parseYouTubeVideoId(`file:///etc/passwd`)).toBeNull()
  })

  it('rejects malformed IDs', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${'a'.repeat(12)}`)).toBeNull()
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=<script>00')).toBeNull()
    expect(parseYouTubeVideoId('https://www.youtube.com/watch')).toBeNull()
    expect(parseYouTubeVideoId('https://youtu.be/')).toBeNull()
  })
})

describe('validateYoutubeUrl', () => {
  it('passes through a trimmed valid address', () => {
    expect(validateYoutubeUrl(`  https://www.youtube.com/watch?v=${ID}  `)).toBe(`https://www.youtube.com/watch?v=${ID}`)
    expect(validateYoutubeUrl('')).toBe('')
  })

  it('throws on a non-YouTube address', () => {
    expect(() => validateYoutubeUrl('https://example.com/video')).toThrow()
  })
})

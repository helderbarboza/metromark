import { parseYouTubeBackgroundTarget, parseYouTubePlaylistId, parseYouTubeVideoId, validateYoutubeUrl } from '$lib/youtube'
import { describe, expect, it } from 'vitest'

const ID = 'dQw4w9WgXcQ'
const PLAYLIST = 'PLabc123XYZ_-0123456789abcdef'

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

describe('parseYouTubePlaylistId', () => {
  it('accepts playlist URLs', () => {
    expect(parseYouTubePlaylistId(`https://www.youtube.com/playlist?list=${PLAYLIST}`)).toBe(PLAYLIST)
    expect(parseYouTubePlaylistId(`https://music.youtube.com/playlist?list=${PLAYLIST}`)).toBe(PLAYLIST)
    expect(parseYouTubePlaylistId(`http://www.youtube.com/playlist?list=${PLAYLIST}`)).toBe(PLAYLIST)
  })

  it('accepts watch, youtu.be and embed URLs carrying a list parameter', () => {
    expect(parseYouTubePlaylistId(`https://www.youtube.com/watch?v=${ID}&list=${PLAYLIST}`)).toBe(PLAYLIST)
    expect(parseYouTubePlaylistId(`https://www.youtube.com/watch?list=${PLAYLIST}`)).toBe(PLAYLIST)
    expect(parseYouTubePlaylistId(`https://youtu.be/${ID}?list=${PLAYLIST}`)).toBe(PLAYLIST)
    expect(parseYouTubePlaylistId(`https://www.youtube.com/embed/videoseries?list=${PLAYLIST}`)).toBe(PLAYLIST)
    expect(parseYouTubePlaylistId(`https://www.youtube-nocookie.com/embed/videoseries?list=${PLAYLIST}`)).toBe(PLAYLIST)
  })

  it('accepts non-PL playlist prefixes', () => {
    expect(parseYouTubePlaylistId('https://www.youtube.com/playlist?list=RD42abcDEF_-xyz')).toBe('RD42abcDEF_-xyz')
    expect(parseYouTubePlaylistId('https://www.youtube.com/playlist?list=UUabcDEF_-12345')).toBe('UUabcDEF_-12345')
  })

  it('rejects addresses without a list parameter', () => {
    expect(parseYouTubePlaylistId('')).toBeNull()
    expect(parseYouTubePlaylistId('not a url')).toBeNull()
    expect(parseYouTubePlaylistId(`https://www.youtube.com/watch?v=${ID}`)).toBeNull()
    expect(parseYouTubePlaylistId(`https://youtu.be/${ID}`)).toBeNull()
    expect(parseYouTubePlaylistId(`https://example.com/playlist?list=${PLAYLIST}`)).toBeNull()
  })

  it('rejects malformed playlist IDs', () => {
    expect(parseYouTubePlaylistId('https://www.youtube.com/playlist?list=ab')).toBeNull()
    expect(parseYouTubePlaylistId(`https://www.youtube.com/playlist?list=${'a'.repeat(65)}`)).toBeNull()
    expect(parseYouTubePlaylistId('https://www.youtube.com/playlist?list=<script>00')).toBeNull()
    expect(parseYouTubePlaylistId('https://www.youtube.com/playlist?list=')).toBeNull()
  })
})

describe('parseYouTubeBackgroundTarget', () => {
  it('resolves a plain video address to a video target', () => {
    expect(parseYouTubeBackgroundTarget(`https://www.youtube.com/watch?v=${ID}`)).toEqual({ kind: 'video', videoId: ID })
    expect(parseYouTubeBackgroundTarget(`https://youtu.be/${ID}`)).toEqual({ kind: 'video', videoId: ID })
  })

  it('resolves a playlist address to a playlist target', () => {
    expect(parseYouTubeBackgroundTarget(`https://www.youtube.com/playlist?list=${PLAYLIST}`)).toEqual({ kind: 'playlist', playlistId: PLAYLIST })
  })

  it('lets the list parameter win over v', () => {
    expect(parseYouTubeBackgroundTarget(`https://www.youtube.com/watch?v=${ID}&list=${PLAYLIST}`)).toEqual({ kind: 'playlist', playlistId: PLAYLIST })
  })

  it('returns null for addresses that are neither', () => {
    expect(parseYouTubeBackgroundTarget('')).toBeNull()
    expect(parseYouTubeBackgroundTarget('javascript:alert(1)')).toBeNull()
    expect(parseYouTubeBackgroundTarget(`https://example.com/watch?v=${ID}`)).toBeNull()
    expect(parseYouTubeBackgroundTarget('https://www.youtube.com/playlist?list=ab')).toBeNull()
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

  it('accepts playlist addresses', () => {
    const playlist = `https://www.youtube.com/playlist?list=${PLAYLIST}`
    expect(validateYoutubeUrl(`  ${playlist}  `)).toBe(playlist)
    expect(validateYoutubeUrl(`https://www.youtube.com/watch?v=${ID}&list=${PLAYLIST}`)).toBe(`https://www.youtube.com/watch?v=${ID}&list=${PLAYLIST}`)
  })
})

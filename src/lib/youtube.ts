// Parsing for user-supplied YouTube addresses.
// This module stays DOM-free so it can be unit tested in node.
// Only validated IDs reach the embed URL; raw input is never interpolated.

import { getT } from '$lib/locale'

const VIDEO_ID = /^[\w-]{11}$/
// Playlist IDs come in many prefixes (PL, RD, UU, OL, …) and lengths; accept
// the URL-safe alphabet with a generous but bounded length.
const PLAYLIST_ID = /^[\w-]{6,64}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

export type YoutubeBackgroundTarget
  = | { kind: 'video', videoId: string }
    | { kind: 'playlist', playlistId: string }

/** Shared prelude: parse and vet the address, leaving the ID extraction to the callers. */
function parseYouTubeUrl(value: string): URL | null {
  const trimmed = value.trim()
  if (trimmed === '')
    return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
    return null
  const host = parsed.hostname.toLowerCase()
  if (!YOUTUBE_HOSTS.has(host))
    return null
  return parsed
}

/**
 * Extract the 11-character video ID from a YouTube address.
 * Accepts watch, youtu.be, shorts, embed, live and v-parameter URLs.
 * Returns null for anything else.
 */
export function parseYouTubeVideoId(value: string): string | null {
  const parsed = parseYouTubeUrl(value)
  if (parsed === null)
    return null
  const host = parsed.hostname.toLowerCase()
  const segments = parsed.pathname.split('/').filter(segment => segment !== '')
  let candidate: string | null = null
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidate = segments[0] ?? null
  }
  else if (segments[0] === 'watch') {
    candidate = parsed.searchParams.get('v')
  }
  else if (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live' || segments[0] === 'v') {
    candidate = segments[1] ?? null
  }
  if (candidate === null)
    return null
  candidate = candidate.trim()
  return VIDEO_ID.test(candidate)
    ? candidate
    : null
}

/**
 * Extract the playlist ID from a YouTube address.
 * Accepts playlist URLs and any address carrying a `list` parameter
 * (watch, youtu.be, embed/videoseries, …). Returns null for anything else.
 */
export function parseYouTubePlaylistId(value: string): string | null {
  const parsed = parseYouTubeUrl(value)
  if (parsed === null)
    return null
  const candidate = parsed.searchParams.get('list')
  if (candidate === null)
    return null
  const trimmed = candidate.trim()
  return PLAYLIST_ID.test(trimmed)
    ? trimmed
    : null
}

/**
 * Resolve what a YouTube background address points at.
 * A `list` parameter wins over `v`: a watch address from inside a playlist
 * is treated as the playlist, not the single video.
 * Returns null when the address is neither a known video nor a playlist URL.
 */
export function parseYouTubeBackgroundTarget(value: string): YoutubeBackgroundTarget | null {
  const playlistId = parseYouTubePlaylistId(value)
  if (playlistId !== null)
    return { kind: 'playlist', playlistId }
  const videoId = parseYouTubeVideoId(value)
  if (videoId !== null)
    return { kind: 'video', videoId }
  return null
}

/**
 * Validate a YouTube background URL as typed by the user.
 * Returns the trimmed original address (stored in settings); the embed URL
 * is derived at render time. Throws with a message meant for the UI.
 */
export function validateYoutubeUrl(value: string): string {
  const url = value.trim()
  if (url === '')
    return ''
  if (parseYouTubeBackgroundTarget(url) === null)
    throw new Error(getT().backgroundErrors.invalidYoutubeAddress())
  return url
}

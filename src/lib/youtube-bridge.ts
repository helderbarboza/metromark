// YouTube iframe widget bridge. A hand-rolled interpreter of YouTube's
// iframe widget protocol, ported from a zero-dependency example.
//
// Zero dependencies and 100% local code, so it is legal inside an MV3
// extension page (default CSP `script-src 'self'`). The official YouTube
// IFrame Player API is not: it is a script on www.youtube.com that loads
// further remote scripts after itself.
//
//    What the official API does          What this does instead
//    ---------------------------------    ------------------------------------
//    new YT.Player(el, {videoId, …})  ->  build the <iframe src="…/embed/ID"> yourself
//    player.playVideo()               ->  postMessage {event:'command', func:'playVideo'}
//    player.getCurrentTime()          ->  read the iframe's infoDelivery messages
//    onReady / onStateChange callbacks ->  same messages, normalized in #handleMessage
//
// This is the protocol Vidstack's EmbedProvider speaks. Undocumented, and it
// can change without notice, so the embed URL also carries autoplay, mute and
// loop parameters. The video plays, muted and looping, even if every handshake
// fails. Treat this bridge as progressive enhancement and the URL parameters
// as the guaranteed floor.
//
// SECURITY: playback commands are posted with targetOrigin '*' because there is
// nothing secret in either direction. The check that matters is inbound, and
// it is the first line of #handleMessage:
//     if (event.source !== this.#frame.contentWindow) return;
// Any window can postMessage to the page; only the frame we created can be .source.

import type { PlaylistCursorStore } from '$lib/playlist-cursor'

/** How a playlist picks its starting video when a page loads. */
export type PlaylistOrder = 'shuffle' | 'sequential'

const YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const)

export type YtStateName = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued'

const STATE_LABEL: Record<string, YtStateName> = {
  '-1': 'unstarted',
  '0': 'ended',
  '1': 'playing',
  '2': 'paused',
  '3': 'buffering',
  '5': 'cued',
}

/**
 * The one genuinely unknown thing here: how the widget learns which origin to
 * trust as its controller. It normally reads the `origin` embed parameter, or
 * falls back to the referring document. A `chrome-extension://` origin is
 * neither obviously allowed nor obviously rejected, so we try all three shapes
 * in order and keep the first one that answers. Each attempt costs one iframe
 * reload (about 1 s) and only happens if the previous one went silent.
 */
export const HANDSHAKES = Object.freeze([
  {
    id: 'origin',
    label: 'origin=<page origin>',
    origin: true,
    referrer: false,
  },
  {
    id: 'referrer',
    label: 'widget_referrer only',
    origin: false,
    referrer: true,
  },
  {
    id: 'bare',
    label: 'no origin hint',
    origin: false,
    referrer: false,
  },
] as const)

export type LoopMode = 'native' | 'js' | 'off'

/** Parameters that make the embed behave like a background layer, no API needed. */
const BASE_PARAMS = Object.freeze({
  enablejsapi: '1', // <- switches the widget protocol on; without it, commands are ignored
  autoplay: '1', // start on its own: we never await a play() promise
  mute: '1', // mandatory, or autoplay is blocked outright
  controls: '0',
  playsinline: '1',
  rel: '0', // no related-video rail on pause/end
  iv_load_policy: '3', // no annotations
  disablekb: '1', // ignore keyboard shortcuts inside the frame
  fs: '0', // no fullscreen button
  cc_load_policy: '3', // no captions
  hl: 'en',
} as const)

const PING_DELAYS = [0, 100, 300, 700, 1200] as const // 'listening' retries, ms after load

/**
 * Inbound allowlist. `event.source === frame.contentWindow` already proves who
 * sent the message, so this is defence in depth: it stops an unexpected origin
 * (say, a redirect we did not ask for) from quietly becoming our state source.
 * youtube.com is listed because the -nocookie host can redirect there.
 */
const ORIGIN_ALLOWLIST: readonly string[] = Object.freeze([
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
  'https://m.youtube.com',
])

function safeParse(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed
  }
  catch {
    return null
  }
}

/** Playback rates YouTube honors; anything else is rejected. */
function parsePlaybackRate(rate: number | undefined): number | null {
  return typeof rate === 'number' && [0.25, 0.5, 1, 1.5, 2].includes(rate)
    ? rate
    : null
}

function isPlayerResponse(data: unknown): data is PlayerResponse {
  if (typeof data !== 'object' || data === null)
    return false
  if (!('event' in data))
    return false
  return typeof data.event === 'string'
}

/** Drop keys whose value is null/undefined/'' — URLSearchParams stringifies them. */
function clean(params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '')
      continue
    out[key] = String(value)
  }
  return out
}

export interface BridgeSnapshot {
  mounted: boolean
  apiReady: boolean
  handshake: string
  attempt: string
  state: YtStateName | 'loading'
  intended: 'playing' | 'paused' | null
  playerState: number | null
  currentTime: number
  duration: number
  loaded: number
  muted: boolean
  volume: number
  loopMode: LoopMode
  messageOrigin: string
  src: string
  /** The rate the player was asked to play at. */
  playbackRate: number
  /** Set when the widget reported an error (e.g. the video is unavailable). */
  error: string | null
}

export interface BridgeOptions {
  /** The video to play. Required for a video embed; pass playlistId for a playlist embed instead. */
  videoId?: string
  /** The playlist to play. Mutually exclusive with videoId. */
  playlistId?: string
  /** How the playlist picks its starting video; defaults to 'shuffle'. */
  playlistOrder?: PlaylistOrder
  /**
   * Persists the sequential cursor (which playlist video comes next) across
   * mounts, keyed by playlist ID. Without it, sequential mode restarts at 0.
   */
  playlistCursor?: PlaylistCursorStore
  /** Embed host; -nocookie keeps YouTube cookies out. */
  host?: string
  /** 'native' = YouTube loops; 'js' = we rewind on ENDED; 'off' = stop at the end. */
  loopMode?: LoopMode
  muted?: boolean
  volume?: number
  /** Set false for reduced motion: the embed loads paused, showing the poster. */
  autoplay?: boolean
  /** Playback rate; YouTube honors 0.25, 0.5, 1, 1.5 and 2. Re-applied after every handshake. */
  playbackRate?: number
  readyTimeout?: number
  targetOrigin?: string
  onEvent?: (snapshot: BridgeSnapshot) => void
  /** Message target; defaults to the page window. Tests inject a fake. */
  target?: BridgeMessageTarget
}

export interface BridgeMessageEvent {
  source: unknown
  origin: string
  data: unknown
}

export interface BridgeMessageTarget {
  addEventListener: (type: 'message', listener: (event: BridgeMessageEvent) => void) => void
  removeEventListener: (type: 'message', listener: (event: BridgeMessageEvent) => void) => void
  /** Optional page location; tests inject one. Defaults to the page's window.location. */
  location?: { origin?: string, href?: string }
}

/** The subset of HTMLIFrameElement the bridge touches. */
export interface BridgeFrame {
  contentWindow: { postMessage: (message: string, targetOrigin: string) => void } | null
  setAttribute: (name: string, value: string) => void
  getAttribute: (name: string) => string | null
  addEventListener: (type: 'load', listener: () => void) => void
}

interface PlayerResponse {
  event: string
  info?: Record<string, unknown>
  playerState?: number
  state?: number
}

/**
 * The bridge itself; used by the YoutubeBackground component. Everything happens
 * through postMessage to the iframe's contentWindow — no remote scripts load
 * into the extension page.
 */
export class YoutubeBackgroundBridge {
  #frame: BridgeFrame
  #opts: {
    videoId: string | null
    playlistId: string | null
    playlistOrder: PlaylistOrder
    playlistCursor: PlaylistCursorStore | null
    host: string
    targetOrigin: string
    readyTimeout: number
    loopMode: LoopMode
    muted: boolean
    volume: number
    autoplay: boolean
    playbackRate: number
    onEvent: (snapshot: BridgeSnapshot) => void
  }

  #target: BridgeMessageTarget
  #onMessageBound: (event: BridgeMessageEvent) => void
  #onLoadBound: () => void
  #mounted = false
  #ready = false
  #hsIndex = 0
  #info: Record<string, unknown> = {}
  #pings: ReturnType<typeof setTimeout>[] = []
  #deadline: ReturnType<typeof setTimeout> | null = null
  /** Playlist bridges shuffle exactly once per mount; armed in #markReady. */
  #shuffleTimer: ReturnType<typeof setTimeout> | null = null
  #shufflePending = false
  #pending = new Map<string, [string, ...unknown[]]>()
  #resumeAt = 0
  #intent: 'playing' | 'paused' | null = null
  #srcOrigin = ''
  #note = ''
  #error: string | null = null

  /** How long after ready the shuffle falls back to a timer if no PLAYING state is reported. */
  static readonly SHUFFLE_FALLBACK_MS = 1500

  constructor(frame: BridgeFrame, options: BridgeOptions) {
    const videoId = options.videoId ?? null
    const playlistId = options.playlistId ?? null
    if (videoId === null && playlistId === null)
      throw new Error('Pass either a videoId or a playlistId.')
    if (videoId !== null && playlistId !== null)
      throw new Error('Pass a videoId or a playlistId, not both.')
    if (videoId !== null && !/^[\w\-]{11}$/.test(videoId))
      throw new Error('Invalid YouTube video ID.')
    if (playlistId !== null && !/^[\w-]{6,64}$/.test(playlistId))
      throw new Error('Invalid YouTube playlist ID.')
    this.#frame = frame
    this.#opts = {
      videoId,
      playlistId,
      playlistOrder: options.playlistOrder === 'sequential'
        ? 'sequential'
        : 'shuffle',
      playlistCursor: options.playlistCursor ?? null,
      host: options.host ?? 'https://www.youtube-nocookie.com',
      targetOrigin: options.targetOrigin ?? '*',
      readyTimeout: options.readyTimeout ?? 4000,
      loopMode: options.loopMode ?? 'native',
      muted: options.muted ?? true,
      volume: options.volume ?? 50,
      autoplay: options.autoplay ?? true,
      playbackRate: parsePlaybackRate(options.playbackRate) ?? 1,
      onEvent: options.onEvent ?? (() => {}),
    }
    this.#target = options.target
      ?? (typeof window !== 'undefined'
        ? window
        : ({
            addEventListener: () => {},
            removeEventListener: () => {},
          } satisfies BridgeMessageTarget))
    this.#onMessageBound = (event: BridgeMessageEvent) => this.#handleMessage(event)
    this.#onLoadBound = () => this.#onFrameLoad()
  }

  /* ------------------------------ public API ------------------------------ */

  /** Build the embed URL, point the iframe at it, and start the handshake. */
  mount(): void {
    if (this.#mounted)
      return
    this.#mounted = true
    this.#hsIndex = 0
    this.#note = ''
    this.#error = null
    this.#shufflePending = false
    this.#target.addEventListener('message', this.#onMessageBound)
    this.#frame.addEventListener('load', this.#onLoadBound)
    this.#navigate()
    this.#emit()
  }

  /** Point the iframe at about:blank. Cheaper and cleaner than pauseVideo(). */
  unmount(): void {
    if (!this.#mounted)
      return
    this.#mounted = false
    this.#ready = false
    this.#clearTimers()
    this.#info = {}
    this.#target.removeEventListener('message', this.#onMessageBound)
    this.#frame.setAttribute('src', 'about:blank')
    this.#emit()
  }

  play(): void {
    this.#intent = 'playing'
    this.#cmd('playVideo')
  }

  pause(): void {
    this.#intent = 'paused'
    this.#cmd('pauseVideo')
  }

  /**
   * The widget reports state about 4 times per second, so `playerState` still
   * says "playing" for a beat after pauseVideo(). Without #intent a double
   * click on the toggle would send pause twice. Same trick HTMLMediaElement
   * uses: the element's own `paused` flips immediately, the reported state
   * catches up.
   */
  toggle(): void {
    const playing = this.#intent === null
      ? this.is('playing')
      : this.#intent === 'playing'
    if (playing)
      this.pause()
    else
      this.play()
  }

  seekTo(seconds: number): void {
    // Round to ms: 12.4 - 10 is 2.4000000000000004 in binary floating point,
    // and that value would end up in both the command and the readout.
    const t = Math.round(Math.max(0, Number(seconds) || 0) * 1000) / 1000
    this.#cmd('seekTo', t, true)
    this.#info.currentTime = t // optimistic, so the UI doesn't stutter
    this.#emit()
  }

  seekBy(delta: number): void { this.seekTo((Number(this.#info.currentTime) || 0) + delta) }

  setMuted(muted: boolean): void {
    this.#opts.muted = !!muted
    this.#cmd(muted ? 'mute' : 'unMute')
    this.#info.muted = this.#opts.muted
    this.#emit()
  }

  setVolume(volume: number): void {
    this.#opts.volume = Math.min(100, Math.max(0, Math.round(Number(volume) || 0)))
    if (this.#opts.volume > 0)
      this.setMuted(false)
    this.#cmd('setVolume', this.#opts.volume)
    this.#info.volume = this.#opts.volume
    this.#emit()
  }

  /**
   * Change the playback rate. The embed has no URL parameter for this, so it
   * is a command on the live player; queued while the handshake is pending.
   * Rates outside the ones YouTube honors are ignored.
   */
  setPlaybackRate(rate: number): void {
    const parsed = parsePlaybackRate(rate)
    if (parsed === null)
      return
    this.#opts.playbackRate = parsed
    this.#cmd('setPlaybackRate', parsed)
    this.#emit()
  }

  /**
   * 'native' = let YouTube loop (loop=1 + playlist=<id>). Works with no API at all.
   * 'js'     = no loop params; we watch for ENDED and rewind. Needs the handshake.
   * 'off'    = stop at the end (the end screen is cropped out of view anyway).
   */
  setLoopMode(mode: LoopMode): void {
    if (mode === this.#opts.loopMode || !['native', 'js', 'off'].includes(mode))
      return
    this.#opts.loopMode = mode
    if (!this.#mounted)
      return
    this.#resumeAt = Number(this.#info.currentTime) || 0 // reloading resets the clock; resume below
    this.#navigate()
    this.#emit()
  }

  /** True when the widget is answering, i.e. every command above actually works. */
  get apiReady(): boolean { return this.#ready }

  is(state: YtStateName): boolean {
    return STATE_LABEL[String(this.#info.playerState)] === state
  }

  /** Everything the UI needs, in one flat object. */
  get snapshot(): BridgeSnapshot {
    const raw = this.#info.playerState
    const state = typeof raw === 'number'
      ? raw
      : undefined
    const src = this.#frame.getAttribute('src')
    return {
      mounted: this.#mounted,
      apiReady: this.#ready,
      handshake: this.#ready
        ? HANDSHAKES[this.#hsIndex].label
        : `no answer — tried ${HANDSHAKES[this.#hsIndex].label}${this.#note
          ? ` (${this.#note})`
          : ''}`,
      attempt: `${this.#hsIndex + 1}/${HANDSHAKES.length}`,
      state: STATE_LABEL[String(state)] ?? 'loading',
      intended: this.#intent,
      playerState: state ?? null,
      currentTime: Number(this.#info.currentTime) || 0,
      duration: Number(this.#info.duration) || 0,
      loaded: Number(this.#info.videoLoadedFraction) || 0,
      muted: Boolean(this.#info.muted ?? this.#opts.muted),
      volume: Number(this.#info.volume ?? this.#opts.volume),
      loopMode: this.#opts.loopMode,
      messageOrigin: this.#srcOrigin === ''
        ? '—'
        : this.#srcOrigin,
      src: src === null || src === ''
        ? 'not mounted'
        : src,
      error: this.#error,
      playbackRate: Number(this.#info.playbackRate ?? this.#opts.playbackRate),
    }
  }

  #pageOrigin(): { origin?: string, href?: string } {
    const injected = this.#target.location
    if (injected)
      return injected
    if (typeof window !== 'undefined')
      return { origin: window.location.origin, href: window.location.href }
    return {}
  }

  /* ---------------------------- URL construction ---------------------------- */

  #buildSrc(handshake: (typeof HANDSHAKES)[number]): string {
    const { videoId, playlistId, host, loopMode, muted, volume, autoplay } = this.#opts
    const location = this.#pageOrigin()
    const params = clean({
      ...BASE_PARAMS,
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0',
      // `start` only survives a reload as a whole number; it is how we resume
      // after a handshake retry or a loop-mode change without the API.
      start: this.#resumeAt > 1
        ? String(Math.floor(this.#resumeAt))
        : '',
      loop: loopMode === 'native'
        ? '1'
        : '',
      // Single video: `loop=1` replays it when `playlist` repeats its ID.
      // Playlist: `loop=1` plays the whole playlist and restarts it.
      playlist: loopMode === 'native' && videoId !== null
        ? videoId
        : '',
      list: playlistId ?? '',
      origin: handshake.origin
        ? (location.origin ?? '')
        : '',
      widget_referrer: handshake.referrer
        ? (location.href ?? '')
        : '',
    })
    // volume is not an embed parameter, so it is re-applied as a command below.
    if (!muted)
      this.#pending.set('setVolume', ['setVolume', volume])
    const qs = new URLSearchParams(params).toString()
    // videoseries is the canonical playlist embed; it needs no video ID in the path.
    const path = playlistId === null
      ? `/embed/${videoId}`
      : '/embed/videoseries'
    return `${host}${path}?${qs}`
  }

  #navigate(): void {
    this.#ready = false
    this.#info = {}
    this.#intent = null
    this.#srcOrigin = ''
    this.#clearTimers()
    this.#frame.setAttribute('src', this.#buildSrc(HANDSHAKES[this.#hsIndex]))
  }

  /* ------------------------------- handshake ------------------------------- */

  #onFrameLoad(): void {
    if (!this.#mounted)
      return // ignore the about:blank load
    const src = this.#frame.getAttribute('src') ?? ''
    if (!src.includes('/embed/'))
      return

    // Announce ourselves. YouTube answers with initialDelivery plus a stream of
    // infoDelivery messages once it has accepted us as the controlling window.
    // The official API includes `channel` and `id`; Vidstack sends neither. Send
    // both shapes — whichever the current widget build expects, we satisfy it.
    PING_DELAYS.forEach((delay, index) => {
      this.#pings.push(setTimeout(() => {
        this.#post(index % 2 === 0
          ? { event: 'listening', id: 'ytbg', channel: 'widget' }
          : { event: 'listening', id: 'ytbg' })
      }, delay))
    })

    this.#deadline = setTimeout(() => this.#handshakeFailed('no reply'), this.#opts.readyTimeout)
  }

  #markReady(): void {
    if (this.#ready)
      return
    this.#ready = true
    this.#note = ''
    this.#clearTimers()
    // Replay anything the UI asked for while we were still shaking hands.
    const replayedRate = this.#pending.has('setPlaybackRate')
    for (const [func, args] of this.#pending) {
      this.#post({
        event: 'command',
        func,
        args: args.slice(1),
        id: 'ytbg',
        channel: 'widget',
      })
    }
    this.#pending.clear()
    // The player starts at 1x after every load; re-apply the configured rate
    // (unless the UI already queued one, which the replay above just posted).
    if (!replayedRate)
      this.#cmd('setPlaybackRate', this.#opts.playbackRate)
    if (this.#opts.playlistId !== null) {
      // Playlist embeds do not carry a shuffle parameter; the order exists
      // only over the widget protocol. setLoop keeps the whole playlist
      // cycling when loopMode is native; the URL already asks for it, this
      // covers the handshake path too. setShuffle must wait until the
      // playlist has actually started — see #armShuffle.
      this.#cmd('setLoop', true)
      if (this.#opts.autoplay) {
        // Reduced motion: the player stays paused on its poster, and picking
        // a video would start it — the cursor and the order are left alone.
        this.#pickPlaylistStart()
        if (this.#opts.playlistOrder === 'shuffle')
          this.#armShuffle()
      }
    }
    this.#unloadCaptionModules()
    this.#emit()
  }

  /**
   * Shuffle a playlist exactly once per mount. Reports from the field show
   * setShuffle sent straight from onReady is ignored — the playlist is not
   * loaded yet — while sending it on the first PLAYING state works. A timer
   * covers widgets that never report the transition.
   */
  #armShuffle(): void {
    this.#shufflePending = true
    if (this.#shuffleTimer !== null)
      clearTimeout(this.#shuffleTimer)
    this.#shuffleTimer = setTimeout(() => this.#doShuffle(), YoutubeBackgroundBridge.SHUFFLE_FALLBACK_MS)
  }

  #doShuffle(): void {
    if (this.#shuffleTimer !== null) {
      clearTimeout(this.#shuffleTimer)
      this.#shuffleTimer = null
    }
    if (!this.#shufflePending)
      return
    this.#shufflePending = false
    this.#cmd('setShuffle', true)
  }

  /**
   * Pick which video of the playlist a new tab plays. The widget delivers the
   * full playlist in initialDelivery, so the length is known by the time the
   * player is ready. playVideoAt is sent before any setShuffle, so the index
   * refers to the original playlist order.
   *
   * Shuffle:    a random index on every mount.
   * Sequential: the next index after the one stored in the persistent
   *             cursor, wrapping at the end. Without a store the cursor reads
   *             as 0 — the playlist starts from the top.
   */
  #pickPlaylistStart(): void {
    const playlistId = this.#opts.playlistId
    if (playlistId === null)
      return
    const info: unknown = this.#info.playlist
    const ids = Array.isArray(info)
      ? info.filter((value): value is string => typeof value === 'string')
      : []
    if (ids.length < 2)
      return // nothing to pick between; the default order plays
    if (this.#opts.playlistOrder === 'sequential') {
      const stored = this.#opts.playlistCursor?.read(playlistId) ?? 0
      const index = ((Math.trunc(stored) % ids.length) + ids.length) % ids.length
      this.#cmd('playVideoAt', index)
      this.#opts.playlistCursor?.write(playlistId, (index + 1) % ids.length)
      return
    }
    this.#cmd('playVideoAt', Math.floor(Math.random() * ids.length))
  }

  /**
   * Force the caption modules off. YouTube has no documented "captions off"
   * embed parameter (only cc_load_policy=1, captions on, and its default
   * follows the viewer's own preference). The IFrame API's unloadModule()
   * works, so we use the same call over the widget wire protocol.
   */
  #unloadCaptionModules(): void {
    this.#cmd('unloadModule', 'captions')
    this.#cmd('unloadModule', 'cc')
  }

  #handshakeFailed(reason: string): void {
    this.#note = reason
    if (this.#hsIndex < HANDSHAKES.length - 1) {
      this.#hsIndex += 1
      this.#resumeAt = Number(this.#info.currentTime) || this.#resumeAt
      this.#emit()
      this.#navigate() // next attempt; #onFrameLoad restarts the clock
    }
    else {
      this.#clearTimers()
      this.#ready = false
      this.#emit() // falls back to pure URL-parameter playback
    }
  }

  /* ------------------------------- messaging ------------------------------- */

  #post(message: Record<string, unknown>): void {
    this.#frame.contentWindow?.postMessage(JSON.stringify(message), this.#opts.targetOrigin)
  }

  #cmd(func: string, ...args: unknown[]): void {
    if (!this.#ready) {
      this.#pending.set(func, [func, ...args]) // replayed in #markReady
      return
    }
    this.#post({
      event: 'command',
      func,
      args,
      id: 'ytbg',
      channel: 'widget',
    })
  }

  #handleMessage(event: BridgeMessageEvent): void {
    if (event.source !== this.#frame.contentWindow)
      return // <- trust boundary
    if (!ORIGIN_ALLOWLIST.includes(event.origin)) {
      // defence in depth
      this.#note = `ignored a message from ${event.origin}`
      this.#emit()
      return
    }
    const data: unknown = typeof event.data === 'string'
      ? safeParse(event.data)
      : event.data
    if (!isPlayerResponse(data))
      return
    const message = data

    if (event.origin && event.origin !== this.#srcOrigin)
      this.#srcOrigin = event.origin

    switch (message.event) {
      case 'onReady':
        this.#markReady()
        break

      case 'initialDelivery': // full state, once
      case 'infoDelivery': // partial state, about 4x/second
      case 'apiInfoDelivery':
        this.#mergeInfo(message.info)
        this.#markReady()
        break

      case 'onStateChange': {
        const state = this.#stateOf(message)
        if (state !== null)
          this.#mergeInfo({ playerState: state })
        break
      }

      case 'onError': {
        const code = typeof message.info === 'number'
          ? String(message.info)
          : String(this.#stateOf(message) ?? 'unknown')
        this.#error = `widget error ${code}`
        this.#note = this.#error
        this.#emit()
        break
      }

      default:
        break // command acks, debug payloads — ignore
    }
  }

  #stateOf(data: PlayerResponse): number | null {
    const info = data.info
    const candidate = info?.playerState ?? info?.state ?? data.playerState ?? data.state
    return typeof candidate === 'number'
      ? candidate
      : null
  }

  #mergeInfo(info: Record<string, unknown> | undefined): void {
    if (!info || typeof info !== 'object')
      return
    const before = this.#info.playerState
    Object.assign(this.#info, info)
    // The widget caught up with what we asked for: stop preferring intent.
    if ('playerState' in info)
      this.#intent = null
    if ('playerState' in info && info.playerState !== before)
      this.#onState(Number(before), Number(info.playerState))
    this.#emit()
  }

  #onState(_before: number, next: number): void {
    if (next === YT_STATE.PLAYING) {
      // The caption module loads lazily once playback starts; unload it again.
      this.#unloadCaptionModules()
      // The playlist is live now: safe to shuffle (once per mount).
      this.#doShuffle()
    }
    if (next === YT_STATE.ENDED && this.#opts.loopMode === 'js') {
      // Native loop is off, so we are the loop.
      if (this.#opts.playlistId !== null) {
        this.#navigate() // a reload restarts the playlist from the top
        return
      }
      if (this.#ready) {
        this.seekTo(0)
        this.play()
      }
      else {
        this.#navigate() // no API: a reload restarts at 0, same effect
      }
    }
  }

  /* --------------------------------- misc --------------------------------- */

  #clearTimers(): void {
    for (const ping of this.#pings)
      clearTimeout(ping)
    this.#pings = []
    if (this.#deadline) {
      clearTimeout(this.#deadline)
      this.#deadline = null
    }
    if (this.#shuffleTimer !== null) {
      clearTimeout(this.#shuffleTimer)
      this.#shuffleTimer = null
    }
  }

  #emit(): void { this.#opts.onEvent(this.snapshot) }
}

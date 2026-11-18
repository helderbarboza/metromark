<script lang='ts'>
  // Decorative YouTube layer for the new-tab background. Mirrors ImageBackground.svelte:
  // absolutely positioned, behind the page, hidden from the accessibility tree.
  // The widget bridge drives the iframe: playback is muted, controls are
  // disabled, and a wrapper that is sized per `fit` and clipped by an
  // overflow-hidden outer layer hides the remaining chrome. An unparseable or
  // empty URL renders nothing. The iframe keeps `zoom-1` (zoom: 1%): the player
  // then lays out against a huge virtual viewport, so its fixed-size chrome
  // renders minuscule while the video still fills the frame.
  //
  // Fit mirrors object-fit for the image background. The embed does not report
  // the video's aspect, so `cover` and `contain` assume 16:9 (the YouTube norm
  // for uploads). `fill` stretches the frame and lets the player letterbox
  // inside it. Parallax mirrors the image background as well: the wrapper is
  // scaled by `parallaxZoom` and shifts with the horizontal scroll. A playlist
  // address embeds the whole playlist and plays it in random order, once per
  // mount, via the widget protocol (see YoutubeBackgroundBridge).

  import type { YoutubeBackgroundSettings } from '$lib/config'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { createPlaylistCursorStore } from '$lib/playlist-cursor'
  import { parseYouTubeBackgroundTarget } from '$lib/youtube'
  import { YoutubeBackgroundBridge } from '$lib/youtube-bridge'
  import { untrack } from 'svelte'

  interface Props {
    /** The YouTube address the user entered — a video or a playlist. Empty renders nothing. */
    src?: string
    /** How the embed fills the page */
    fit?: YoutubeBackgroundSettings['fit']
    /** Layer opacity over the base color */
    opacity?: YoutubeBackgroundSettings['opacity']
    /** 0..1 progress through the horizontal scroll; drives the parallax */
    scrollProgress?: number
    /** Enable the scroll parallax. Forced off by reduced motion. */
    parallax?: YoutubeBackgroundSettings['parallax']
    /** Layer scale as a multiple of the base box; bigger means wider layer and more travel */
    parallaxZoom?: YoutubeBackgroundSettings['parallaxZoom']
    /** Playback speed; YouTube honors 0.25, 0.5, 1, 1.5 and 2 */
    playbackRate?: YoutubeBackgroundSettings['playbackRate']
    /** How the playlist picks its starting video; only applies to playlist addresses */
    playlistOrder?: YoutubeBackgroundSettings['playlistOrder']
    /** Base color under the YouTube layer */
    color?: string
    /** When reduced motion is on, the embed renders paused instead of autoplaying */
    reducedMotion?: boolean
    /** Called when the widget reports the video cannot be played. */
    onerror?: () => void
  }

  const {
    src = '',
    fit = BACKGROUND_DEFAULTS.youtube.fit,
    opacity = BACKGROUND_DEFAULTS.youtube.opacity,
    scrollProgress = 0,
    parallax = BACKGROUND_DEFAULTS.youtube.parallax,
    parallaxZoom = BACKGROUND_DEFAULTS.youtube.parallaxZoom,
    playbackRate = BACKGROUND_DEFAULTS.youtube.playbackRate,
    playlistOrder = BACKGROUND_DEFAULTS.youtube.playlistOrder,
    color,
    reducedMotion = false,
    onerror,
  }: Props = $props()

  let frame = $state<HTMLIFrameElement | null>(null)
  // A `list` parameter makes the address a playlist; a plain video otherwise.
  const target = $derived(parseYouTubeBackgroundTarget(src))
  const videoId = $derived(target?.kind === 'video' ? target.videoId : null)
  const playlistId = $derived(target?.kind === 'playlist' ? target.playlistId : null)
  let playing = $state(false)
  let started = $state(false)
  $effect(() => {
    if (playing)
      untrack(() => { started = true })
  })
  const resolvedFit = $derived(fit ?? BACKGROUND_DEFAULTS.youtube.fit)
  const resolvedOpacity = $derived(opacity ?? BACKGROUND_DEFAULTS.youtube.opacity)
  const resolvedRate = $derived(playbackRate ?? BACKGROUND_DEFAULTS.youtube.playbackRate)
  const resolvedOrder = $derived(playlistOrder ?? BACKGROUND_DEFAULTS.youtube.playlistOrder)
  // Box sizes for the embed: `cover` is the smallest 16:9 box that covers the
  // viewport, `contain` the largest that fits inside it. The video fills a
  // 16:9 iframe exactly, so these need no measurement. `fill` is the raw
  // viewport stretch (the historical behavior).
  const ASPECT_W = 'calc(100dvh * 16 / 9)'
  const ASPECT_H = 'calc(100cqw * 9 / 16)'
  const BASE_BOX = {
    cover: { width: `max(100cqw, ${ASPECT_W})`, height: `max(100dvh, ${ASPECT_H})` },
    contain: { width: `min(100cqw, ${ASPECT_W})`, height: `min(100dvh, ${ASPECT_H})` },
    fill: { width: '100cqw', height: '100dvh' },
  } as const
  const resolvedZoom = $derived(parallaxZoom ?? BACKGROUND_DEFAULTS.youtube.parallaxZoom)
  const parallaxActive = $derived(parallax === true && !reducedMotion && target !== null)
  const zoom = $derived(parallaxActive ? resolvedZoom : 1)
  /**
   * Offset as a percentage of the layer's own width: `translateX` percentages
   * resolve against the layer itself. (0.5 - p) keeps the direction picked for
   * the inverted mapping: rest is shifted positive, full scroll negative.
   */
  const shift = $derived((0.5 - scrollProgress) * ((zoom - 1) / zoom) * 100)
  const boxSize = $derived.by(() => {
    const base = BASE_BOX[resolvedFit ?? 'cover']
    return {
      width: zoom === 1 ? base.width : `calc(${base.width} * ${zoom})`,
      height: zoom === 1 ? base.height : `calc(${base.height} * ${zoom})`,
    }
  })
  const boxTransform = $derived(
    parallaxActive ? `translate3d(calc(-50% + ${shift}%), -50%, 0)` : 'translate3d(-50%, -50%, 0)',
  )

  // Kept in a plain variable so the rate effect below can reach the live
  // player without making the bridge a reactive dependency of the frame effect.
  let bridge: YoutubeBackgroundBridge | null = null
  // One store per component; reads/writes are synchronous and local.
  const playlistCursor = createPlaylistCursorStore()

  $effect(() => {
    // Rebuild the bridge whenever the source or the motion preference changes.
    const id = videoId
    const list = playlistId
    const el = frame
    const source: { videoId: string } | { playlistId: string } | null
      = list !== null ? { playlistId: list } : id !== null ? { videoId: id } : null
    if (!el || source === null) {
      bridge = null
      return
    }
    let errorReported = false
    const current = new YoutubeBackgroundBridge(el, {
      ...source,
      // Looping is implicit: there is no user-facing setting for it.
      // Playlists loop as a whole and play in a random order.
      loopMode: 'native',
      autoplay: !reducedMotion,
      // Read untracked: changing how the playlist picks its start applies on
      // the next new tab, and must not rebuild the iframe under the user.
      playlistOrder: untrack(() => resolvedOrder),
      playlistCursor,
      // Read untracked: changing the rate must not rebuild the iframe.
      playbackRate: untrack(() => resolvedRate),
      onEvent: (snapshot) => {
        playing = snapshot.state === 'playing'
        // Widget-reported error, or all three handshake attempts went silent
        // (the params-only fallback): either way the video is not visibly playing.
        const handshakeExhausted = !snapshot.apiReady && snapshot.attempt === '3/3'
        if ((snapshot.error !== null || handshakeExhausted) && !errorReported) {
          errorReported = true
          onerror?.()
        }
      },
    })
    bridge = current
    current.mount()
    return () => {
      current.unmount()
      if (bridge === current)
        bridge = null
    }
  })

  // Playback speed is a command on the live player, not something the embed
  // can take as a URL parameter; rebuilding the iframe to change it would stutter.
  $effect(() => {
    bridge?.setPlaybackRate(resolvedRate)
  })

</script>

<div
  aria-hidden='true'
  data-mounted='true'
  data-playing='true'
  data-crop='true'
  class='
    group/bg @container pointer-events-none absolute inset-0 -z-1 overflow-hidden
    bg-background
    **:pointer-events-none!
  '
  style:background={color}
>
  {#if target}
    <div
      class='absolute top-1/2 left-1/2 overflow-hidden transition-opacity duration-150'
      style:width={boxSize.width}
      style:height={boxSize.height}
      style:transform={boxTransform}
      style:opacity={started ? resolvedOpacity : 0}
    >
      <iframe
        bind:this={frame}
        title=""
        tabindex='-1'
        scrolling='no'
        frameborder='0'
        class='absolute inset-0 size-full zoom-1 border-0'
        allow='autoplay; encrypted-media; picture-in-picture'
        referrerpolicy='strict-origin-when-cross-origin'
      ></iframe>
    </div>
  {/if}
</div>

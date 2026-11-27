<script lang='ts'>
  // The page backdrop: picks the right layer for the configured background and
  // centralizes the settings defaults so callers pass one object. Hidden from
  // the accessibility tree; every layer sits behind the page content.

  import type { Settings } from '$lib/config'
  import ColorBackground from '$lib/components/organisms/ColorBackground.svelte'
  import ImageBackground from '$lib/components/organisms/ImageBackground.svelte'
  import ShaderBackground from '$lib/components/organisms/ShaderBackground.svelte'
  import YoutubeBackground from '$lib/components/organisms/YoutubeBackground.svelte'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { buildTileClipPath } from '$lib/cutouts'
  import { getShader, NONE_SHADER_ID } from '$lib/shaders'
  import { shaderBenchmark } from '$lib/shaders/benchmark.svelte'

  interface Props {
    background: Settings['background']
    /** The app "Reduce motion" setting or the OS reduced-motion preference. */
    reducedMotion?: boolean
    /** 0..1 progress through the horizontal scroll; drives the image parallax */
    scrollProgress?: number
    /** Called when the renderer freezes due to sustained struggle */
    onstruggle?: () => void
    /** Called when the image fails to load. */
    onerror?: () => void
    /** Called when the YouTube video cannot be played. */
    onyoutubeerror?: () => void
    /** Clip the live background layer to the tile rectangles. */
    cutoutTiles?: boolean
    /** Board scroll viewport; used to clip cutouts to tile shapes. */
    scroller?: HTMLElement | null
  }

  const {
    background,
    reducedMotion = false,
    scrollProgress = 0,
    onstruggle,
    onerror,
    onyoutubeerror,
    cutoutTiles = false,
    scroller = null,
  }: Props = $props()

  const shaderBackground = $derived(
    background.type === 'shader'
      ? background
      : undefined,
  )
  const shader = $derived.by(() => {
    const bg = shaderBackground
    if (!bg)
      return undefined
    const id = bg.shaderId ?? NONE_SHADER_ID
    if (id === NONE_SHADER_ID)
      return undefined
    return getShader(id)
  })
  /** Custom base color, or undefined when the theme background shows through. */
  const baseColor = $derived(
    background.auto === false
      ? background.color
      : undefined,
  )
  /** The live layer is clipped to the tiles instead of being sampled onto canvas. */
  const layerFilter = $derived(
    cutoutTiles
      ? 'brightness(0.76)'
      : undefined,
  )
  // Shaders have no parallax of their own. Give their cutout layer the same
  // horizontal drift as an image background so the tiles keep a depth effect.
  const SHADER_CUTOUT_ZOOM = 1.5
  const shaderCutout = $derived(
    cutoutTiles && background.type === 'shader' && !reducedMotion,
  )
  const shaderStyle = $derived.by(() => {
    if (!shaderCutout)
      return undefined
    const zoom = SHADER_CUTOUT_ZOOM
    const shift = (0.5 - scrollProgress) * ((zoom - 1) / zoom) * 100
    const width = `${zoom * 100}%`
    const left = `${(1 - zoom) * 50}%`
    const transform = `translate3d(${shift}%, 0, 0)`
    return `width: ${width}; left: ${left}; transform: ${transform};`
  })
  let wrapper = $state<HTMLDivElement | null>(null)
  let clip = $state<string | undefined>(undefined)

  $effect(() => {
    const element = wrapper
    const board = scroller
    if (!cutoutTiles) {
      clip = undefined
      return
    }
    if (!element || !board)
      return
    let frame = 0
    const update = () => {
      frame = 0
      const origin = element.getBoundingClientRect()
      const tiles = board.querySelectorAll<HTMLElement>('[data-cutout-tile]')
      clip = buildTileClipPath(tiles, origin)
    }
    const schedule = () => {
      if (frame === 0)
        frame = requestAnimationFrame(update)
    }
    update()
    board.addEventListener('scroll', schedule, { passive: true })
    const observer = new MutationObserver(schedule)
    observer.observe(board, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'style',
        'class',
        'data-offscreen',
        'data-cutout-tile',
      ],
    })
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(element)
    return () => {
      if (frame !== 0)
        cancelAnimationFrame(frame)
      board.removeEventListener('scroll', schedule)
      observer.disconnect()
      resizeObserver.disconnect()
    }
  })
</script>

<!--
  With cutouts on, the live background stays visible but is clipped to the tile
  rectangles. Gaps fall back to the page color; no offscreen canvas is needed.
-->
<div
  bind:this={wrapper}
  data-testid='page-background'
  class='pointer-events-none absolute inset-0 -z-1'
  style:clip-path={clip}
  style:filter={layerFilter}
  aria-hidden='true'
>
  <div
    class={shaderCutout ? 'absolute inset-y-0' : 'absolute inset-0'}
    style={shaderStyle}
  >
    {#if background.type === 'color'}
      {#if baseColor}
        <ColorBackground color={baseColor} />
      {/if}
    {:else if background.type === 'image'}
      <ImageBackground
        src={background.url}
        color={baseColor}
        fit={background.fit ?? BACKGROUND_DEFAULTS.image.fit}
        opacity={background.opacity ?? BACKGROUND_DEFAULTS.image.opacity}
        parallax={background.parallax ?? BACKGROUND_DEFAULTS.image.parallax}
        parallaxZoom={background.parallaxZoom ?? BACKGROUND_DEFAULTS.image.parallaxZoom}
        {scrollProgress}
        {reducedMotion}
        {onerror}
      />
    {:else if background.type === 'youtube'}
      <YoutubeBackground
        src={background.url}
        fit={background.fit ?? BACKGROUND_DEFAULTS.youtube.fit}
        opacity={background.opacity ?? BACKGROUND_DEFAULTS.youtube.opacity}
        parallax={background.parallax ?? BACKGROUND_DEFAULTS.youtube.parallax}
        parallaxZoom={background.parallaxZoom ?? BACKGROUND_DEFAULTS.youtube.parallaxZoom}
        playbackRate={background.playbackRate ?? BACKGROUND_DEFAULTS.youtube.playbackRate}
        paused={background.paused ?? BACKGROUND_DEFAULTS.youtube.paused}
        playlistOrder={background.playlistOrder ?? BACKGROUND_DEFAULTS.youtube.playlistOrder}
        color={baseColor}
        {scrollProgress}
        {reducedMotion}
        onerror={onyoutubeerror ?? onerror}
      />
    {:else if shaderBackground && shader}
      <ShaderBackground
        {shader}
        {reducedMotion}
        animated={!shaderBenchmark.running && shaderBackground.paused !== true}
        color={baseColor}
        speed={shaderBackground.speed ?? BACKGROUND_DEFAULTS.shader.speed}
        targetFps={shaderBackground.targetFps ?? BACKGROUND_DEFAULTS.shader.targetFps}
        quality={shaderBackground.quality ?? BACKGROUND_DEFAULTS.shader.quality}
        opacity={shaderBackground.opacity ?? BACKGROUND_DEFAULTS.shader.opacity}
        mouseInteraction={shaderBackground.mouseInteraction
          ?? BACKGROUND_DEFAULTS.shader.mouseInteraction}
        renderScale={shaderBackground.renderScale ?? BACKGROUND_DEFAULTS.shader.renderScale}
        {onstruggle}
      />
    {/if}
  </div>
</div>

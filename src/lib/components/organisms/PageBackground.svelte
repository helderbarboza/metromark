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
  }

  const {
    background,
    reducedMotion = false,
    scrollProgress = 0,
    onstruggle,
    onerror,
    onyoutubeerror,
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
</script>

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

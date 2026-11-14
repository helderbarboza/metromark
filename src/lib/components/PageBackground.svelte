<script lang='ts'>
  // The page backdrop: picks the right layer for the configured background and
  // centralizes the settings defaults so callers pass one object. Hidden from
  // the accessibility tree; every layer sits behind the page content.

  import type { Settings } from '$lib/config'
  import ColorBackground from '$lib/components/ColorBackground.svelte'
  import ImageBackground from '$lib/components/ImageBackground.svelte'
  import ShaderBackground from '$lib/components/ShaderBackground.svelte'
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
  }

  const {
    background,
    reducedMotion = false,
    scrollProgress = 0,
    onstruggle,
    onerror,
  }: Props = $props()

  const shaderBackground = $derived(
    background.type === 'shader' ? background : undefined,
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
    background.auto === false ? background.color : undefined,
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
    fit={background.fit ?? 'cover'}
    opacity={background.opacity ?? 1}
    parallax={background.parallax ?? false}
    parallaxZoom={background.parallaxZoom ?? 1.5}
    {scrollProgress}
    {reducedMotion}
    {onerror}
  />
{:else if shaderBackground && shader}
  <ShaderBackground
    {shader}
    {reducedMotion}
    animated={!shaderBenchmark.running}
    color={baseColor}
    speed={shaderBackground.speed ?? 1}
    targetFps={shaderBackground.targetFps ?? 60}
    quality={shaderBackground.quality ?? 'motion'}
    opacity={shaderBackground.opacity ?? 1}
    mouseInteraction={shaderBackground.mouseInteraction ?? true}
    renderScale={shaderBackground.renderScale ?? 0.5}
    {onstruggle}
  />
{/if}

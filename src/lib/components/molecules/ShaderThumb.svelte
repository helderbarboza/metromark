<script lang='ts'>
  import type { ShaderDefinition } from '$lib/shaders'
  import type { ShaderBenchmarkResult } from '$lib/shaders/benchmark.svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import ShaderBackground from '$lib/components/organisms/ShaderBackground.svelte'
  import { Button } from '$lib/components/ui/button'
  import { BENCHMARK_PRESENTATION } from '$lib/shaders/benchmark-ui'

  interface Props {
    /** The shader to preview, or null for the "None" tile (no shader renders). */
    shader?: ShaderDefinition | null
    pressed: boolean
    disabled: boolean
    reducedMotion: boolean
    /** Benchmark result for this shader, null when it has not run yet. */
    benchmark?: ShaderBenchmarkResult | null
    onselect: () => void
  }

  const {
    shader = null,
    pressed,
    disabled,
    reducedMotion,
    benchmark = null,
    onselect,
  }: Props = $props()

  // Shaders animate only while hovered (or keyboard-focused); otherwise a
  // representative frame stays on the canvas.
  let animated = $state(false)

  const signal = $derived.by(() => {
    if (shader == null || benchmark?.status !== 'ok' || !benchmark.level)
      return null
    const detail = `${benchmark.avgFrameMs.toFixed(1)} ms avg frame`
    const presentation = BENCHMARK_PRESENTATION[benchmark.level]
    return {
      icon: presentation.icon,
      class: presentation.class,
      avgFrameTime: benchmark.avgFrameMs.toFixed(1),
      label: `Performance: ${presentation.short.toLowerCase()} (${detail})`,
      title: `${presentation.short} · ${detail}`,
    }
  })
</script>

<Button
  type='button'
  variant={pressed ? 'default' : 'secondary'}
  {disabled}
  aria-pressed={pressed}
  class='h-auto w-full flex-col items-stretch gap-1.5 p-1.25 text-left'
  onpointerenter={() => (animated = true)}
  onpointerleave={() => (animated = false)}
  onfocus={() => (animated = true)}
  onblur={() => (animated = false)}
  onclick={onselect}
>
  {#if shader}
    <span class='relative isolate block aspect-video w-full overflow-hidden bg-black'>
      <ShaderBackground
        {shader}
        reducedMotion={reducedMotion}
        animated={animated}
        targetFps={15}
        renderScale={0.5}
        mouseInteraction={false}
        metrics={false}
      />
      {#if signal}
        <div class='absolute right-0 bottom-0 m-px bg-background/70 px-1' title={signal.title}>
          <span class='flex shrink-0 items-center text-[0.625rem] text-muted-foreground'>
            <span>{signal.avgFrameTime} ms</span>
            <Icon name={signal.icon} class={signal.class} />
          </span>
        </div>
      {/if}
    </span>
  {:else}
    <span
      class='
        flex aspect-video w-full items-center justify-center overflow-hidden bg-(--muted)
      '
    >
      <Icon name='prohibited' size={32} class='text-(--muted-foreground)' />
    </span>
  {/if}
  <span class='flex w-full items-center justify-between gap-1 px-0.5'>
    <span class='truncate text-xs'>
      {shader?.name ?? 'None'}
    </span>
  </span>
</Button>

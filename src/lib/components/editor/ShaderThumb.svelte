<script lang='ts'>
  import type { ShaderDefinition } from '$lib/shaders'
  import Background from '$lib/components/Background.svelte'
  import { Button } from '$lib/components/ui/button'

  interface Props {
    shader: ShaderDefinition
    pressed: boolean
    disabled: boolean
    reducedMotion: boolean
    onselect: () => void
  }

  const { shader, pressed, disabled, reducedMotion, onselect }: Props = $props()

  // Shaders animate only while hovered (or keyboard-focused); otherwise a
  // representative frame stays on the canvas.
  let animated = $state(false)
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
  <span class='relative isolate block aspect-video w-full overflow-hidden bg-black'>
    <Background
      {shader}
      reducedMotion={reducedMotion}
      animated={animated}
      targetFps={15}
      renderScale={0.5}
      mouseInteraction={false}
      metrics={false}
    />
  </span>
  <span class='w-full truncate px-0.5 text-[10px]/tight'>
    {shader.name}
  </span>
</Button>

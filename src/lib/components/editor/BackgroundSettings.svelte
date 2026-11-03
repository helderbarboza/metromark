<script lang='ts'>
  import type { Settings } from '$lib/config'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { shaders } from '$lib/shaders'
  import { shaderMetrics } from '$lib/shaders/metrics.svelte'
  import { levelFps, levelFrame, levelWorst } from '$lib/shaders/quality'
  import { Tabs } from 'bits-ui'
  import Slider from '../ui/Slider.svelte'
  import BackgroundColorMode from './BackgroundColorMode.svelte'

  interface Props {
    settings: Settings
    busy: boolean
    onchange: (patch: Partial<Settings>) => void
  }

  type BackgroundType = Settings['background']['type']
  type ShaderBackground = Extract<Settings['background'], { type: 'shader' }>
  const BACKGROUND_TYPES = ['color', 'image', 'shader'] as const satisfies readonly BackgroundType[]
  const SHADERS = Object.values(shaders)

  const { settings, busy, onchange }: Props = $props()

  const autoColor = $derived(
    settings.background.type === 'color' ? settings.background.auto !== false : true,
  )

  function isBackgroundType(value: string): value is BackgroundType {
    return BACKGROUND_TYPES.some(type => type === value)
  }

  function selectBackground(type: BackgroundType) {
    if (settings.background.type === type)
      return
    // Replace the whole variant so the object shape matches the new `type`.
    onchange({ background: { ...BACKGROUND_DEFAULTS[type] } })
  }

  function setColorMode(auto: boolean, color?: string) {
    if (settings.background.type !== 'color')
      return
    onchange({ background: { ...settings.background, auto, color } })
  }

  function updateShader(patch: Partial<ShaderBackground>) {
    if (settings.background.type !== 'shader')
      return
    onchange({ background: { ...settings.background, ...patch } })
  }
</script>

<Tabs.Root
  value={settings.background.type}
  onValueChange={(tab) => {
    if (isBackgroundType(tab))
      selectBackground(tab)
  }}
>
  <Tabs.List class='mb-4 flex rounded-sm border border-(--line) p-0.75'>
    {#each BACKGROUND_TYPES as type (type)}
      <Tabs.Trigger
        value={type}
        disabled={busy}
        class='
          flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px] text-(--muted) capitalize
          disabled:cursor-not-allowed disabled:opacity-50
          data-[state=active]:bg-(--surface-hover) data-[state=active]:text-(--text)
        '
      >
        {type}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
  <Tabs.Content value='color'>
    {#if settings.background.type === 'color'}
      <BackgroundColorMode
        auto={autoColor}
        color={settings.background.color}
        {busy}
        idPrefix='background'
        onchange={setColorMode}
      />
    {/if}
  </Tabs.Content>
  <Tabs.Content value='image'>
    image
  </Tabs.Content>
  <Tabs.Content value='shader'>
    {#if settings.background.type === 'shader'}
      <div class='mb-4 flex flex-wrap gap-2'>
        {#each SHADERS as shader (shader.id)}
          <button
            type='button'
            class='
              rounded-[3px] bg-transparent px-2.25 py-1.5 text-[10px] text-(--muted)
              disabled:cursor-not-allowed disabled:opacity-50
              aria-pressed:bg-(--surface-hover) aria-pressed:text-(--text)
            '
            aria-pressed={settings.background.shaderId === shader.id}
            disabled={busy}
            onclick={() => updateShader({ shaderId: shader.id })}
          >
            {shader.name}
          </button>
        {/each}
      </div>
      <div class='mb-4 flex rounded-sm border border-(--line) p-0.75'>
        <button
          type='button'
          class='
            flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px] text-(--muted)
            aria-pressed:bg-(--surface-hover) aria-pressed:text-(--text)
          '
          aria-pressed={(
            settings.background.type === 'shader'
              ? settings.background.quality
              : 'motion') === 'motion'}
          disabled={busy}
          onclick={() => updateShader({ quality: 'motion' })}
        >
          Smooth motion
        </button>
        <button
          type='button'
          class='
            flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px] text-(--muted)
            aria-pressed:bg-(--surface-hover) aria-pressed:text-(--text)
          '
          aria-pressed={(settings.background.type === 'shader'
            ? settings.background.quality
            : 'motion') === 'detail'}
          disabled={busy}
          onclick={() => updateShader({ quality: 'detail' })}
        >
          Sharp detail
        </button>
      </div>
      <p class='mb-4 text-[10px] leading-[1.6] text-(--muted)'>
        Under load, keep the frame rate and lower resolution, or keep
        resolution and lower the frame rate. Hidden while reduced motion is on.
      </p>
      <BackgroundColorMode
        auto={settings.background.auto ?? true}
        color={settings.background.color}
        {busy}
        idPrefix='shader-background'
        onchange={(auto, color) => updateShader({ auto, color })}
      />
      <div class='mt-4 grid gap-3'>
        {@render range(
          'shader-speed',
          'Speed',
          settings.background.speed ?? 1,
          0,
          4,
          0.1,
          value => updateShader({ speed: value }),
        )}
        {@render range(
          'shader-fps',
          'Maximum FPS',
          settings.background.targetFps ?? 60,
          0,
          120,
          1,
          value => updateShader({ targetFps: value }),
          value => (value === 0 ? 'Auto' : String(value)),
        )}
        {@render range(
          'shader-opacity',
          'Opacity',
          settings.background.opacity ?? 1,
          0,
          1,
          0.05,
          value => updateShader({ opacity: value }),
        )}
        {@render range(
          'shader-render-scale',
          'Maximum render scale',
          settings.background.renderScale ?? 0.5,
          0.25,
          1.5,
          0.05,
          value => updateShader({ renderScale: value }),
          value => `${Math.round(value * 100)}%`,
        )}
      </div>
      {@const metrics = shaderMetrics.current}
      {#if metrics}
        <div class='mt-4 grid grid-cols-2 gap-2 text-[11px]' aria-label='Animated background performance'>
          <div class='rounded-sm border border-(--line) p-2'>
            <div class='text-[9px] text-(--muted)'>FPS</div>
            <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--danger)' : levelFps(metrics.fps, metrics.targetFps) === 'danger' ? 'text-(--danger)' : levelFps(metrics.fps, metrics.targetFps) === 'warn' ? 'text-(--warn)' : 'text-(--text)'}'>
              {metrics.level === 'frozen' ? '—' : metrics.fps.toFixed(0)}
            </div>
          </div>
          <div class='rounded-sm border border-(--line) p-2'>
            <div class='text-[9px] text-(--muted)'>Frame</div>
            <div class='font-mono tabular-nums {levelFrame(metrics.frameMs, metrics.nominalMs) === 'danger' ? 'text-(--danger)' : levelFrame(metrics.frameMs, metrics.nominalMs) === 'warn' ? 'text-(--warn)' : 'text-(--text)'}'>
              {metrics.frameMs.toFixed(1)} ms
            </div>
          </div>
          <div class='rounded-sm border border-(--line) p-2'>
            <div class='text-[9px] text-(--muted)'>Worst</div>
            <div class='font-mono tabular-nums {levelWorst(metrics.worstMs, metrics.nominalMs) === 'danger' ? 'text-(--danger)' : levelWorst(metrics.worstMs, metrics.nominalMs) === 'warn' ? 'text-(--warn)' : 'text-(--text)'}'>
              {metrics.worstMs.toFixed(1)} ms
            </div>
          </div>
          <div class='rounded-sm border border-(--line) p-2'>
            <div class='text-[9px] text-(--muted)'>Quality</div>
            <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--danger)' : metrics.level === 'reduced' ? 'text-(--warn)' : 'text-(--text)'}'>
              {metrics.quality === 'motion' ? 'Motion' : 'Detail'} · {metrics.level}
            </div>
          </div>
        </div>
      {:else}
        <p class='mt-4 text-[10px] leading-[1.6] text-(--muted)'>
          No animated background is running.
        </p>
      {/if}
      <div class='mt-4 flex items-start justify-between gap-3.75 text-[11px]'>
        <div>
          <label for='shader-mouse'>Mouse interaction</label>
          <p id='shader-mouse-hint' class='mt-1.75 text-[10px] text-(--muted)'>
            Let the shader follow your pointer.
          </p>
        </div>
        <input
          id='shader-mouse'
          type='checkbox'
          role='switch'
          aria-describedby='shader-mouse-hint'
          checked={settings.background.mouseInteraction ?? true}
          disabled={busy}
          class='
            h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-[20px]
            bg-(--line) p-0.75
            before:block before:size-3 before:rounded-full before:bg-(--muted)
            before:transition-transform before:duration-130
            checked:bg-(--accent)
            checked:before:translate-x-3.25 checked:before:bg-(--accent-ink)
            disabled:cursor-not-allowed disabled:opacity-50
          '
          onchange={event => updateShader({ mouseInteraction: event.currentTarget.checked })}
        />
      </div>
    {/if}
  </Tabs.Content>
</Tabs.Root>

{#snippet range(
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  apply: (value: number) => void,
  format?: (value: number) => string,
)}
  <div class='grid gap-1.5'>
    <div class='flex items-center justify-between text-[11px] text-(--muted)'>
      <label for={id}>{label}</label>
      <span class='text-(--text)'>{format ? format(value) : value}</span>
    </div>
    <Slider
      type='single'
      {min}
      {max}
      {value}
      {step}
      onValueCommit={v => apply(v)}
    />
  </div>
{/snippet}

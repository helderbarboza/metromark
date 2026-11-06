<script lang='ts'>
  import type { Settings } from '$lib/config'

  import { Slider } from '$lib/components/ui/slider'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { shaders } from '$lib/shaders'
  import { shaderMetrics } from '$lib/shaders/metrics.svelte'
  import { levelFps, levelFrame, levelWorst } from '$lib/shaders/quality'
  import { Tabs } from 'bits-ui'
  import BackgroundColorMode from './BackgroundColorMode.svelte'
  import SettingsField from './SettingsField.svelte'

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
  <Tabs.List class='mb-4 flex rounded-sm border border-(--border) p-0.75'>
    {#each BACKGROUND_TYPES as type (type)}
      <Tabs.Trigger
        value={type}
        disabled={busy}
        class='
          flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px] text-(--muted-foreground)
          capitalize
          disabled:cursor-not-allowed disabled:opacity-50
          data-[state=active]:bg-(--accent) data-[state=active]:text-(--foreground)
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
              rounded-[3px] bg-transparent px-2.25 py-1.5 text-[10px]
              text-(--muted-foreground)
              disabled:cursor-not-allowed disabled:opacity-50
              aria-pressed:bg-(--accent) aria-pressed:text-(--foreground)
            '
            aria-pressed={settings.background.shaderId === shader.id}
            disabled={busy}
            onclick={() => updateShader({ shaderId: shader.id })}
          >
            {shader.name}
          </button>
        {/each}
      </div>
      <div class='mb-4 flex rounded-sm border border-(--border) p-0.75'>
        <button
          type='button'
          class='
            flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px]
            text-(--muted-foreground)
            aria-pressed:bg-(--accent) aria-pressed:text-(--foreground)
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
            flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px]
            text-(--muted-foreground)
            aria-pressed:bg-(--accent) aria-pressed:text-(--foreground)
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
      <p class='mb-4 text-[10px] leading-[1.6] text-(--muted-foreground)'>
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
      <div class='mt-4 grid gap-1'>
        <SettingsField
          icon='personRunning'
          title='Shader speed'
          helpText='Shader animation speed factor'
          controlId='shader-speed'
        >
          <span>{settings.background.speed}x</span>
          <Slider
            id='shader-speed'
            class='w-32'
            type='single'
            value={settings.background.speed ?? 1}
            min={0.1}
            max={4}
            step={0.1}
            onValueChange={v => updateShader({ speed: v })}
          />
        </SettingsField>
        <SettingsField
          icon='gauge'
          title='Maximum FPS'
          helpText='Limit the framerate'
          controlId='shader-fps'
        >
          <ToggleGroup.Root
            type='single'
            value={String(settings.background.targetFps ?? 60)}
            onValueChange={v => updateShader({ targetFps: Number(v) })}
            id='shader-fps'
          >
            {#each [15, 30, 60, 120, 0] as value (value)}
              <ToggleGroup.Item value={String(value)} class='grow'>
                {value === 0 ? 'Auto' : value}
              </ToggleGroup.Item>
            {/each}
          </ToggleGroup.Root>
        </SettingsField>
        <SettingsField
          icon='transparencySquare'
          title='Opacity'
          helpText='Make the shader transparent'
          controlId='shader-opacity'
        >
          <span>{(settings.background.opacity ?? 1) * 100}%</span>
          <Slider
            id='shader-opacity'
            type='single'
            value={settings.background.opacity ?? 1}
            min={0.0}
            max={1.0}
            step={0.1}
            class='w-32'
            onValueChange={v => updateShader({ opacity: v })}
          />
        </SettingsField>
        <SettingsField
          icon='scaleFill'
          title='Maximum render scale'
          helpText='...'
          controlId='shader-render-scale'
        >
          <span>{settings.background.renderScale}x</span>
          <Slider
            id='shader-render-scale'
            type='single'
            value={settings.background.renderScale ?? 0.5}
            min={0.25}
            max={1.0}
            step={[0.25, 0.5, 0.75, 1.0]}
            class='mt-6 w-32'
            onValueChange={v => updateShader({ renderScale: v })}
          />
        </SettingsField>
      </div>
      {@const metrics = shaderMetrics.current}
      {#if metrics}
        <div class='mt-4 grid grid-cols-2 gap-2 text-xs' aria-label='Animated background performance'>
          <div class='rounded-sm border border-(--border) p-2'>
            <div class='text-[9px] text-(--muted-foreground)'>FPS</div>
            <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--destructive)' : levelFps(metrics.fps, metrics.targetFps) === 'danger' ? 'text-(--destructive)' : levelFps(metrics.fps, metrics.targetFps) === 'warn' ? 'text-(--warn)' : 'text-(--foreground)'}'>
              {metrics.level === 'frozen' ? '—' : metrics.fps.toFixed(0)}
            </div>
          </div>
          <div class='rounded-sm border border-(--border) p-2'>
            <div class='text-[9px] text-(--muted-foreground)'>Frame</div>
            <div class='font-mono tabular-nums {levelFrame(metrics.frameMs, metrics.nominalMs) === 'danger' ? 'text-(--destructive)' : levelFrame(metrics.frameMs, metrics.nominalMs) === 'warn' ? 'text-(--warn)' : 'text-(--foreground)'}'>
              {metrics.frameMs.toFixed(1)} ms
            </div>
          </div>
          <div class='rounded-sm border border-(--border) p-2'>
            <div class='text-[9px] text-(--muted-foreground)'>Worst</div>
            <div class='font-mono tabular-nums {levelWorst(metrics.worstMs, metrics.nominalMs) === 'danger' ? 'text-(--destructive)' : levelWorst(metrics.worstMs, metrics.nominalMs) === 'warn' ? 'text-(--warn)' : 'text-(--foreground)'}'>
              {metrics.worstMs.toFixed(1)} ms
            </div>
          </div>
          <div class='rounded-sm border border-(--border) p-2'>
            <div class='text-[9px] text-(--muted-foreground)'>Quality</div>
            <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--destructive)' : metrics.level === 'reduced' ? 'text-(--warn)' : 'text-(--foreground)'}'>
              {metrics.quality === 'motion' ? 'Motion' : 'Detail'} · {metrics.level}
            </div>
          </div>
        </div>
      {:else}
        <p class='mt-4 text-[10px] leading-[1.6] text-(--muted-foreground)'>
          No animated background is running.
        </p>
      {/if}
      <div class='mt-4 flex items-start justify-between gap-3.75 text-xs'>
        <div>
          <label for='shader-mouse'>Mouse interaction</label>
          <p id='shader-mouse-hint' class='mt-1.75 text-[10px] text-(--muted-foreground)'>
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
            bg-(--border) p-0.75
            before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
            before:transition-transform before:duration-130
            checked:bg-(--primary)
            checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
            disabled:cursor-not-allowed disabled:opacity-50
          '
          onchange={event => updateShader({ mouseInteraction: event.currentTarget.checked })}
        />
      </div>
    {/if}
  </Tabs.Content>
</Tabs.Root>

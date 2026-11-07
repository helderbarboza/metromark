<script lang='ts'>
  import type { Settings } from '$lib/config'

  import * as Select from '$lib/components/ui/select'
  import { Slider } from '$lib/components/ui/slider'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { shaders } from '$lib/shaders'
  import { shaderMetrics } from '$lib/shaders/metrics.svelte'
  import { levelFps, levelFrame, levelWorst } from '$lib/shaders/quality'
  import BackgroundColorMode from './BackgroundColorMode.svelte'
  import CollapsibleSection from './CollapsibleSection.svelte'
  import SettingsRow from './SettingsRow.svelte'
  import ShaderThumb from './ShaderThumb.svelte'

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

  // Draft state keeps the sliders responsive while settings changes round-trip
  // through the async command queue. The parent owns the persisted values;
  // these mirror what the user sees while dragging. A closure captures the
  // mount-time value on purpose; the effect below keeps them in sync after.
  const initialShader = () =>
    settings.background.type === 'shader' ? settings.background : undefined
  let speedDraft = $state(initialShader()?.speed ?? 1)
  let opacityDraft = $state(initialShader()?.opacity ?? 1)
  let renderScaleDraft = $state(initialShader()?.renderScale ?? 0.5)
  let dragging = $state(false)
  // Target of the last commit, so a stale in-flight snapshot does not pull the
  // drafts back before the coordinator persists and republishes.
  let pending = $state<{ speed: number, opacity: number, renderScale: number } | null>(null)

  const COMMIT_INTERVAL_MS = 125
  let lastCommitAt = 0
  let trailingTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const bg = settings.background
    if (bg.type !== 'shader') {
      // Switching away from the shader tab cancels any in-flight commit tracking
      // so the drafts re-sync when the user comes back.
      pending = null
      dragging = false
      return
    }
    if (pending) {
      if (
        (bg.speed ?? 1) === pending.speed
        && (bg.opacity ?? 1) === pending.opacity
        && (bg.renderScale ?? 0.5) === pending.renderScale
      ) {
        pending = null
      }
      return
    }
    if (dragging)
      return
    speedDraft = bg.speed ?? 1
    opacityDraft = bg.opacity ?? 1
    renderScaleDraft = bg.renderScale ?? 0.5
  })

  $effect(() => () => clearTimeout(trailingTimer))

  function commitDrafts() {
    const bg = settings.background
    if (bg.type !== 'shader')
      return
    clearTimeout(trailingTimer)
    trailingTimer = undefined
    lastCommitAt = Date.now()
    pending = { speed: speedDraft, opacity: opacityDraft, renderScale: renderScaleDraft }
    onchange({ background: { ...bg, ...pending } })
  }

  function scheduleCommit() {
    const elapsed = Date.now() - lastCommitAt
    if (elapsed >= COMMIT_INTERVAL_MS) {
      commitDrafts()
      return
    }
    clearTimeout(trailingTimer)
    trailingTimer = setTimeout(commitDrafts, COMMIT_INTERVAL_MS - elapsed)
  }

  function dragSpeed(value: number) {
    speedDraft = value
    dragging = true
    scheduleCommit()
  }

  function dragOpacity(value: number) {
    opacityDraft = value
    dragging = true
    scheduleCommit()
  }

  function dragRenderScale(value: number) {
    renderScaleDraft = value
    dragging = true
    scheduleCommit()
  }

  function finishDrag() {
    dragging = false
    commitDrafts()
  }
</script>

<CollapsibleSection open={true} title='background type' icon='customize'>
  {#snippet control()}
    <Select.Root
      type='single'

      value={settings.background.type}
      onValueChange={(tab) => {
        if (isBackgroundType(tab))
          selectBackground(tab)
      }}
    >
      <Select.Trigger class='w-20'>{settings.background.type}</Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each BACKGROUND_TYPES as type (type)}
            <Select.Item value={type}>{type}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  {/snippet}
  {#if settings.background.type === 'color'}
    <BackgroundColorMode
      auto={autoColor}
      color={settings.background.color}
      {busy}
      idPrefix='background'
      onchange={setColorMode}
    />
  {/if}
  {#if settings.background.type === 'shader'}
    <div class='p-4'>
      <div class='grid grid-cols-2 gap-2'>
        {#each SHADERS as shader (shader.id)}
          <ShaderThumb
            {shader}
            pressed={settings.background.shaderId === shader.id}
            disabled={busy}
            reducedMotion={settings.reducedMotion}
            onselect={() => updateShader({ shaderId: shader.id })}
          />
        {/each}
      </div>
    </div>
    <SettingsRow
      title='Performance priority'
      helpText='What to keep when the GPU is busy.'
      controlId='shader-quality'
      disabled={busy}
    >
      <ToggleGroup.Root
        type='single'
        id='shader-quality'
        value={(
          settings.background.type === 'shader'
            ? settings.background.quality
            : 'motion')}
        disabled={busy}
        onValueChange={(v) => {
          if (v !== 'motion' && v !== 'detail')
            return
          updateShader({ quality: v })
        }}
      >
        <ToggleGroup.Item value='motion' class='grow'>Frame rate</ToggleGroup.Item>
        <ToggleGroup.Item value='detail' class='grow'>Resolution</ToggleGroup.Item>
      </ToggleGroup.Root>
    </SettingsRow>
    <BackgroundColorMode
      auto={settings.background.auto ?? true}
      color={settings.background.color}
      {busy}
      idPrefix='shader-background'
      onchange={(auto, color) => updateShader({ auto, color })}
    />
    <SettingsRow
      title='Shader speed'
      helpText='Shader animation speed factor'
      controlId='shader-speed'
    >
      <span>{speedDraft.toFixed(1)}x</span>
      <Slider
        id='shader-speed'
        class='w-32'
        type='single'
        value={speedDraft}
        min={0.1}
        max={4}
        step={0.1}
        onValueChange={dragSpeed}
        onValueCommit={finishDrag}
      />
    </SettingsRow>
    <SettingsRow
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
    </SettingsRow>
    <SettingsRow
      title='Opacity'
      helpText='Make the shader transparent'
      controlId='shader-opacity'
    >
      <span>{Math.round(opacityDraft * 100)}%</span>
      <Slider
        id='shader-opacity'
        type='single'
        value={opacityDraft}
        min={0.0}
        max={1.0}
        step={0.1}
        class='w-32'
        onValueChange={dragOpacity}
        onValueCommit={finishDrag}
      />
    </SettingsRow>
    <SettingsRow
      title='Maximum render scale'
      controlId='shader-render-scale'
    >
      <span>{renderScaleDraft}x</span>
      <Slider
        id='shader-render-scale'
        type='single'
        value={renderScaleDraft}
        min={0.25}
        max={1.0}
        step={[0.25, 0.5, 0.75, 1.0]}
        class='w-32'
        onValueChange={dragRenderScale}
        onValueCommit={finishDrag}
      />
    </SettingsRow>
    {@const metrics = shaderMetrics.current}
    {#if metrics}
      <div
        class='grid grid-cols-2 gap-2 p-4 text-xs'
        aria-label='Animated background performance'
      >
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
          <div class='text-[9px] text-(--muted-foreground)'>Priority</div>
          <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--destructive)' : metrics.level === 'reduced' ? 'text-(--warn)' : 'text-(--foreground)'}'>
            {metrics.quality === 'motion' ? 'Frame rate' : 'Resolution'} · {metrics.level}
          </div>
        </div>
      </div>
    {:else}
      <p class='p-4 text-[10px] leading-[1.6] text-(--muted-foreground)'>
        No animated background is running.
      </p>
    {/if}
    <SettingsRow
      title='Mouse interaction'
      helpText='Let the shader follow your pointer.'
      controlId='shader-mouse'
      disabled={busy}
    >
      <input
        id='shader-mouse'
        type='checkbox'
        role='switch'
        aria-describedby='shader-mouse-help'
        checked={settings.background.mouseInteraction ?? true}
        disabled={busy}
        onchange={event => updateShader({ mouseInteraction: event.currentTarget.checked })}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-[20px]
          bg-(--border) p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
          disabled:cursor-not-allowed disabled:opacity-50
        '
      />
    </SettingsRow>
  {/if}

</CollapsibleSection>

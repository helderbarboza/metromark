<script lang='ts'>
  import type { Settings } from '$lib/config'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { shaders } from '$lib/shaders'
  import { Tabs } from 'bits-ui'
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
          'Target FPS',
          settings.background.targetFps ?? 60,
          0,
          120,
          1,
          value => updateShader({ targetFps: value }),
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
)}
  <div class='grid gap-1.5'>
    <div class='flex items-center justify-between text-[11px] text-(--muted)'>
      <label for={id}>{label}</label>
      <span class='text-(--text)'>{value}</span>
    </div>
    <input
      {id}
      type='range'
      {min}
      {max}
      {step}
      {value}
      disabled={busy}
      class='w-full accent-(--accent) disabled:cursor-not-allowed disabled:opacity-50'
      onchange={event => apply(Number(event.currentTarget.value))}
    />
  </div>
{/snippet}

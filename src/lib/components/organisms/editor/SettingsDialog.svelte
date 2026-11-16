<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { ThemeSelections } from '$lib/theme-picker'
  import type { Command, Settings } from '$lib/types'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import CollapsibleSection from '$lib/components/molecules/CollapsibleSection.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import SettingsCard from '$lib/components/molecules/SettingsCard.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import ThemeGallery from '$lib/components/organisms/editor/ThemeGallery.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { setSettingsContext } from '$lib/settings-context'
  import { getThemeSelections } from '$lib/theme-picker'
  import { getTheme } from '$lib/themes.js'
  import { setMode, systemPrefersMode, userPrefersMode } from 'mode-watcher'
  import BackgroundSettings from './BackgroundSettings.svelte'

  interface Props {
    settings: Settings
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
    onresetpreview?: () => Promise<void>
  }

  const {
    settings,
    oncommand,
    onclose,
    onresetpreview,
  }: Props = $props()

  const { state: command, send, run } = createDialogCommand(
    command => oncommand(command),
    () => onclose(),
  )

  const densities = ['comfortable', 'compact'] as const
  const modes = ['system', 'light', 'dark'] as const

  let confirmReset = $state(false)
  let confirmFactory = $state(false)
  let confirmPreview = $state(false)

  async function setting(patch: Partial<Settings>) {
    await send({ type: 'settings.update', patch }, false)
  }

  // Provide settings to the dialog subtree (e.g. the Background tab) as a
  // getter closure so consumers stay reactive without prop drilling.
  setSettingsContext(() => ({
    settings,
    busy: command.busy,
    update: patch => void setting(patch),
  }))

  async function resetPreview() {
    await run(async () => {
      await onresetpreview?.()
      onclose()
    })
  }

  const isPreview = $derived(typeof onresetpreview === 'function')
  const tabs: { value: string, icon: IconName, label: string }[] = [
    { value: 'appearance', icon: 'paintBrush', label: 'Appearance' },
    { value: 'tiles', icon: 'customize', label: 'Tiles' },
    { value: 'background', icon: 'image', label: 'Background' },
    { value: 'advanced', icon: 'settings', label: 'Advanced' },
  ]

  let themes: ThemeSelections = $state(getThemeSelections())

  const layoutsHelp = $derived(
    confirmReset
      ? 'Reset tile layouts for every group?'
      : 'Reset positions to browser bookmark order. '
        + 'Your colors, sizes, and bookmarks stay intact.',
  )
  const factoryHelp = $derived(
    confirmFactory
      ? 'Reset MetroMark to factory defaults?'
      : 'Reset tile colors, sizes, placements, and display options. '
        + 'This also resets your theme and mode and clears Undo history. '
        + 'Your bookmarks stay. This cannot be undone.',
  )
</script>

<Tabs.Root value={tabs[0].value}>
  <Tabs.List variant='line'>
    {#each tabs as { value, label, icon } (value)}
      <Tabs.Trigger {value}>
        <Icon name={icon} />
        {label}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>

  <Tabs.Content value='appearance' class='mt-4 grid animate-rise-enter gap-1'>
    <SettingsCard
      icon='darkTheme'
      title='Mode'
      helpText='Light, dark, or match the system'
      controlId='app-mode'
    >
      <ToggleGroup.Root
        type='single'
        value={userPrefersMode.current}
        onValueChange={(v) => {
          // bits-ui passes a bare string; mode-watcher only accepts known modes.
          if (v === 'light' || v === 'dark' || v === 'system')
            setMode(v)
        }}
        id='app-mode'
        aria-labelledby='app-mode-title'
        aria-describedby='app-mode-help'
      >
        {#each modes as mode (mode)}
          <ToggleGroup.Item
            value={mode}
            class={mode === 'system' ? 'grow' : 'grow capitalize'}
          >
            {mode === 'system' ? `System (${systemPrefersMode.current})` : mode}
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsCard>

    <CollapsibleSection
      icon='color'
      title='Themes'
      helpText='Pick the colors used in light and dark mode'
    >
      {#snippet control()}
        <div class='inline-flex items-center gap-2 text-sm'>
          <span>{getTheme(themes.light)?.label ?? themes.light}</span>
          <span aria-hidden='true' class='text-(--muted-foreground)'>·</span>
          <span>{getTheme(themes.dark)?.label ?? themes.dark}</span>
        </div>
      {/snippet}
      <div class='p-4'>
        <ThemeGallery bind:themes />
      </div>
    </CollapsibleSection>
  </Tabs.Content>

  <Tabs.Content value='tiles' class='mt-4 grid animate-rise-enter gap-1'>
    <SettingsCard
      icon='density'
      title='Tile density'
      helpText='Comfortable adds space; compact fits more tiles'
      controlId='tile-density'
    >
      <ToggleGroup.Root
        type='single'
        id='tile-density'
        aria-labelledby='tile-density-title'
        aria-describedby='tile-density-help'
        value={settings.density}
        disabled={command.busy}
        onValueChange={(v) => {
          if (v !== 'comfortable' && v !== 'compact')
            return
          setting({ density: v })
        }}
      >
        {#each densities as density (density)}
          <ToggleGroup.Item value={density} class='grow capitalize'>
            {density}
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsCard>
    <SettingsCard
      icon='globe'
      title='Show website addresses'
      helpText='Show the domain under each tile title'
      controlId='show-domains'
    >
      <input
        id='show-domains'
        type='checkbox'
        role='switch'
        aria-describedby='show-domains-help'
        checked={settings.showDomains}
        disabled={command.busy}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
          disabled:cursor-not-allowed disabled:opacity-50
        '
        onchange={event => setting({ showDomains: event.currentTarget.checked })}
      />
    </SettingsCard>
    <SettingsCard
      icon='color'
      title='Original favicons'
      helpText='Show the full-color favicon instead of a single-color Metro glyph'
      controlId='original-favicons'
    >
      <input
        id='original-favicons'
        type='checkbox'
        role='switch'
        aria-describedby='original-favicons-help'
        checked={settings.originalFavicons}
        disabled={command.busy}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
          disabled:cursor-not-allowed disabled:opacity-50
        '
        onchange={event => setting({ originalFavicons: event.currentTarget.checked })}
      />
    </SettingsCard>
    <SettingsCard
      icon='pause'
      title='Reduce motion'
      helpText='Disables tile, menu, and background animations'
      controlId='reduce-motion'
    >
      <input
        id='reduce-motion'
        type='checkbox'
        role='switch'
        aria-describedby='reduce-motion-help'
        checked={settings.reducedMotion}
        disabled={command.busy}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
          disabled:cursor-not-allowed disabled:opacity-50
        '
        onchange={event => setting({ reducedMotion: event.currentTarget.checked })}
      />
    </SettingsCard>
    <SettingsCard
      icon='refresh'
      title='Reset tile layouts'
      helpText={layoutsHelp}
      controlId='reset-layouts'
    >
      {#if confirmReset}
        <Button onclick={() => (confirmReset = false)}>Cancel</Button>
        <Button
          variant='default'
          disabled={command.busy}
          aria-describedby='reset-layouts-help'
          onclick={() => send({ type: 'layout.reset' })}
        >
          Reset with Undo
        </Button>
      {:else}
        <Button id='reset-layouts' onclick={() => (confirmReset = true)}>
          Reset tile layouts
        </Button>
      {/if}
    </SettingsCard>
  </Tabs.Content>
  <Tabs.Content value='background' class='mt-4 grid animate-rise-enter gap-1'>
    <BackgroundSettings />
  </Tabs.Content>
  <Tabs.Content value='advanced' class='mt-4 grid animate-rise-enter gap-1'>
    <SettingsCard
      icon='buildingFactory'
      title='Factory reset'
      helpText={factoryHelp}
      controlId='factory-reset'
    >
      {#if confirmFactory}
        <Button disabled={command.busy} onclick={() => (confirmFactory = false)}>
          Cancel
        </Button>
        <Button
          variant='destructive'
          disabled={command.busy}
          aria-describedby='factory-reset-help'
          onclick={() => send({ type: 'factory.reset' })}
        >
          Reset MetroMark
        </Button>
      {:else}
        <Button
          id='factory-reset'
          disabled={command.busy}
          onclick={() => (confirmFactory = true)}
        >
          Factory reset
        </Button>
      {/if}
    </SettingsCard>
  </Tabs.Content>
</Tabs.Root>

<DialogError error={command.error} />

{#if isPreview}
  <div class='mt-7 rounded-sm border border-(--border) bg-(--background) p-4.25'>
    <span class='text-[0.5rem] tracking-widest text-(--muted-foreground)'>DEMO WORKSPACE</span>
    <p class='mt-2.25 mb-3.25 text-[10px] leading-relaxed text-(--muted-foreground)'>
      This preview uses sample bookmarks, not your real browser data.
    </p>
    {#if confirmPreview}
      <Button disabled={command.busy} onclick={resetPreview}>
        Confirm demo reset
      </Button>
    {:else}
      <button
        class='bg-transparent p-0 text-[10px] text-(--primary)'
        onclick={() => (confirmPreview = true)}
      >
        Restore sample bookmarks
      </button>
    {/if}
  </div>
{/if}

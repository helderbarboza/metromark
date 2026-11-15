<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { ThemeSelections } from '$lib/theme-picker'
  import type { Command, Settings } from '$lib/types'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import ThemeGallery from '$lib/components/organisms/editor/ThemeGallery.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { setSettingsContext } from '$lib/settings-context'
  import { getThemeSelections } from '$lib/theme-picker'
  import { getTheme } from '$lib/themes.js'
  import { setMode, systemPrefersMode, userPrefersMode } from 'mode-watcher'
  import CollapsibleSection from '../../molecules/CollapsibleSection.svelte'
  import SettingsCard from '../../molecules/SettingsCard.svelte'
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
    { value: 'reset', icon: 'arrowReset', label: 'Reset' },
  ]

  let themes: ThemeSelections = $state(getThemeSelections())
</script>

<Tabs.Root value={tabs[0].value}>
  <Tabs.List>
    {#each tabs as { value, label, icon } (value)}
      <Tabs.Trigger {value}>
        <Icon name={icon} />
        {label}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>

  <Tabs.Content value='appearance' class='mt-4 grid gap-1'>
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

  <Tabs.Content value='tiles' class='mt-4 grid gap-1'>
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
  </Tabs.Content>
  <Tabs.Content value='background' class='mt-4 grid gap-1'>
    <BackgroundSettings />
  </Tabs.Content>
  <Tabs.Content value='reset' class='mt-4 grid gap-1'>

    <div class='mb-7.25'>
      <h3 class='mb-3.25 text-xs font-[550]'>Reset layouts</h3>
      <p class='m-0 text-xs/relaxed text-(--muted-foreground)'>
        Reset positions to browser bookmark order. Your colors, sizes, and
        bookmarks stay intact.
      </p>
      {#if confirmReset}
        <div class='mt-3.5'>
          <p class='mb-3 text-xs'>Reset tile layouts for every group?</p>
          <div class='flex w-full gap-1'>
            <Button class='grow' onclick={() => (confirmReset = false)}>Cancel</Button>
            <Button
              class='grow'
              variant='default'
              disabled={command.busy}
              onclick={() => send({ type: 'layout.reset' })}
            >
              <Icon name='undo' size={15} />
              Reset with Undo
            </Button>
          </div>
        </div>
      {:else}
        <Button class='mt-3.75 w-full' onclick={() => (confirmReset = true)}>
          <Icon name='refresh' size={15} />
          Reset tile layouts
        </Button>
      {/if}
    </div>

    <div class='mb-7.25 border-t border-(--border) pt-5.5'>
      <h3 class='mb-3.25 text-xs font-[550]'>Factory reset</h3>
      <p class='mx-0 mt-0 mb-3.75 text-xs/relaxed text-(--muted-foreground)'>
        Reset tile colors, sizes, placements, and display options. This also
        resets your theme and mode and clears Undo history. Your bookmarks
        stay. This cannot be undone.
      </p>
      {#if confirmFactory}
        <div class='mt-3.5'>
          <p class='mb-3 text-xs'>Reset MetroMark to factory defaults?</p>
          <div class='flex w-full gap-1'>
            <Button class='grow' disabled={command.busy} onclick={() => (confirmFactory = false)}>
              Cancel
            </Button>
            <Button
              class='grow'
              variant='destructive'
              disabled={command.busy}
              onclick={() => send({ type: 'factory.reset' })}
            >
              <Icon name='buildingFactory' size={15} />
              Reset MetroMark
            </Button>
          </div>
        </div>
      {:else}
        <Button
          class='mt-3.75 w-full'
          disabled={command.busy}
          onclick={() => (confirmFactory = true)}
        >
          <Icon name='buildingFactory' size={15} />
          Factory reset
        </Button>
      {/if}
    </div>

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

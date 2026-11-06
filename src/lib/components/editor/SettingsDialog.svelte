<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { ThemeSelections } from '$lib/theme-picker'
  import type { Command, Settings } from '$lib/types'
  import { createDialogCommand } from '$lib/components/editor/dialog-command.svelte'
  import DialogError from '$lib/components/editor/DialogError.svelte'
  import ThemeGallery from '$lib/components/editor/ThemeGallery.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { getThemeSelections } from '$lib/theme-picker'
  import { setMode, systemPrefersMode, userPrefersMode } from 'mode-watcher'
  import BackgroundSettings from './BackgroundSettings.svelte'
  import CollapsibleField from './CollapsibleField.svelte'
  import SettingsField from './SettingsField.svelte'

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

  const { state: command, send, run } = createDialogCommand(oncommand, onclose)

  const densities = ['comfortable', 'compact'] as const
  const modes = ['system', 'light', 'dark'] as const

  let confirmReset = $state(false)
  let confirmFactory = $state(false)
  let confirmPreview = $state(false)

  async function setting(patch: Partial<Settings>) {
    await send({ type: 'settings.update', patch }, false)
  }

  async function resetPreview() {
    await run(async () => {
      await onresetpreview?.()
      onclose()
    })
  }

  const isPreview = $derived(typeof onresetpreview === 'function')
  const tabs: { value: string, icon: IconName, label: string }[] = [
    { value: 'appearance', icon: 'paintBrush', label: 'Appearance' },
    { value: 'tiles', icon: 'paintBrush', label: 'Tiles' },
    { value: 'background', icon: 'paintBrush', label: 'Background' },
    { value: 'reset', icon: 'paintBrush', label: 'Reset' },
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
    <SettingsField
      icon='darkTheme'
      title='Mode'
      helpText='Color mode'
      controlId='app-mode'
    >
      <ToggleGroup.Root
        type='single'
        value={userPrefersMode.current}
        onValueChange={v => setMode(v)}
        id='app-mode'
      >
        {#each modes as mode (mode)}
          <ToggleGroup.Item
            value={mode}
            class='grow capitalize'
          >
            {mode}
            {#if mode === 'system'}
              <p>({systemPrefersMode.current})</p>
            {/if}
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsField>

    <CollapsibleField
      icon='color'
      title='Themes'
      helpText='Color theme'
      value={`${themes.light}, ${themes.dark}`}
    >
      <div class='p-4'>
        <ThemeGallery bind:themes />
      </div>
    </CollapsibleField>

    <!-- <div class='mb-7.25'>
      <h3 class='mb-3.25 text-xs font-[550]'>Canvas</h3>
      <ThemeGallery />
    </div> -->
  </Tabs.Content>

  <Tabs.Content value='tiles' class='mt-4 grid gap-1'>
    <div class='mb-7.25'>
      <h3 class='mb-3.25 text-xs font-[550]'>Tile density</h3>
      <div class='mb-2.25 flex rounded-sm border border-(--border) p-0.75'>
        {#each densities as density (density)}
          <button
            class='
              flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px]
              text-(--muted-foreground) capitalize
              aria-pressed:bg-(--accent) aria-pressed:text-(--foreground)
            '
            aria-pressed={settings.density === density}
            disabled={command.busy}
            onclick={() => setting({ density })}
          >
            {density}
          </button>
        {/each}
      </div>
      <p class='m-0 text-xs leading-[1.65] text-(--muted-foreground)'>
        Coordinates stay the same. Just a little more breathing room.
      </p>
    </div>

    <div class='mb-7.25'>
      <div class='flex flex-col'>
        <label class='mb-5.75 flex items-center justify-between gap-3.75 text-xs'>
          <span>
            Show website addresses
            <small class='mt-1.75 block text-[10px] text-(--muted-foreground)'>
              A little context below each title.
            </small>
          </span>
          <input
            type='checkbox'
            role='switch'
            checked={settings.showDomains}
            disabled={command.busy}
            class='
              h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-[20px]
              bg-(--border) p-0.75
              before:block before:size-3 before:rounded-full
              before:bg-(--muted-foreground) before:transition-transform
              before:duration-130
              checked:bg-(--primary)
              checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
            '
            onchange={event => setting({ showDomains: event.currentTarget.checked })}
          />
        </label>
        <label class='mb-5.75 flex items-center justify-between gap-3.75 text-xs'>
          <span>
            Reduce motion
            <small class='mt-1.75 block text-[10px] text-(--muted-foreground)'>
              A quieter, more instant experience.
            </small>
          </span>
          <input
            type='checkbox'
            role='switch'
            checked={settings.reducedMotion}
            disabled={command.busy}
            class='
              h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-[20px]
              bg-(--border) p-0.75
              before:block before:size-3 before:rounded-full
              before:bg-(--muted-foreground) before:transition-transform
              before:duration-130
              checked:bg-(--primary)
              checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
            '
            onchange={event => setting({ reducedMotion: event.currentTarget.checked })}
          />
        </label>
      </div>
    </div>
  </Tabs.Content>
  <Tabs.Content value='background' class='mt-4 grid gap-1'>

    <div class='mb-7.25'>
      <h3 class='mb-3.25 text-xs font-[550]'>Background</h3>

      <BackgroundSettings {settings} busy={command.busy} onchange={setting} />
    </div>
  </Tabs.Content>
  <Tabs.Content value='reset' class='mt-4 grid gap-1'>

    <div class='mb-7.25'>
      <h3 class='mb-3.25 text-xs font-[550]'>A fresh arrangement</h3>
      <p class='m-0 text-xs leading-[1.65] text-(--muted-foreground)'>
        Reset positions to browser bookmark order. Your colors, sizes, and
        bookmarks stay intact.
      </p>
      {#if confirmReset}
        <div class='mt-3.5'>
          <p class='mb-3 text-xs'>Reset layouts for every group?</p>
          <Button
            variant='default'
            disabled={command.busy}
            onclick={() => send({ type: 'layout.reset' })}
          >
            Reset with Undo
          </Button>
          <Button class='mr-1.25' onclick={() => (confirmReset = false)}>Cancel</Button>
        </div>
      {:else}
        <Button class='mt-3.75 w-full text-[10px]' onclick={() => (confirmReset = true)}>
          <Icon name='refresh' size={15} />
          Reset tile layouts
        </Button>
      {/if}
    </div>

    <div class='mb-7.25 border-t border-(--border) pt-5.5'>
      <h3 class='mb-3.25 text-xs font-[550]'>Factory reset</h3>
      <p class='mx-0 mt-0 mb-3.75 text-xs leading-[1.65] text-(--muted-foreground)'>
        Reset tile colors, sizes, placements, and display options. This also
        resets your theme and mode and clears Undo history. Your bookmarks
        stay. This cannot be undone.
      </p>
      {#if confirmFactory}
        <div class='inl mt-3.5'>
          <p class='mb-3 text-xs'>Reset Metro to factory defaults?</p>
          <div class='flex w-full gap-1'>
            <Button disabled={command.busy} onclick={() => (confirmFactory = false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              disabled={command.busy}
              onclick={() => send({ type: 'factory.reset' })}
            >
              <Icon name='refresh' size={15} />
              Reset Metro
            </Button>
          </div>
        </div>
      {:else}
        <Button
          class='mt-3.75 w-full text-[10px]'
          disabled={command.busy}
          onclick={() => (confirmFactory = true)}
        >
          <Icon name='refresh' size={15} />
          Factory reset
        </Button>
      {/if}
    </div>

  </Tabs.Content>
</Tabs.Root>

<DialogError error={command.error} />

{#if isPreview}
  <div class='mt-7 rounded-sm border border-(--border) bg-(--background) p-4.25'>
    <span class='text-[0.5rem] tracking-[1.1px] text-(--muted-foreground)'>DEMO WORKSPACE</span>
    <p class='mt-2.25 mb-3.25 text-[10px] leading-[1.7] text-(--muted-foreground)'>
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

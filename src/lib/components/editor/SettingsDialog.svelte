<script lang='ts'>
  import type { Command, Settings } from '$lib/types'
  import Button from '$lib/components/Button.svelte'
  import { createDialogCommand } from '$lib/components/editor/dialog-command.svelte'
  import DialogError from '$lib/components/editor/DialogError.svelte'
  import ThemeGallery from '$lib/components/editor/ThemeGallery.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { setMode, systemPrefersMode, userPrefersMode } from 'mode-watcher'

  const {
    settings,
    oncommand,
    onclose,
    onresetpreview,
  }: {
    settings: Settings
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
    onresetpreview?: () => Promise<void>
  } = $props()

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
</script>

<p class='mb-6.5 text-[13px] leading-[1.8] text-(--muted)'>
  A familiar feeling. A space that's entirely yours.
</p>

<div class='mb-7.25'>
  <h3 class='mb-3.25 text-[11px] font-[550]'>Mode</h3>
  <div class='mb-2.25 flex rounded-sm border border-(--line) p-0.75'>
    {#each modes as modeOption (modeOption)}
      <button
        class='
          flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px] text-(--muted) capitalize
          aria-pressed:bg-(--surface-hover) aria-pressed:text-(--text)
        '
        aria-pressed={userPrefersMode.current === modeOption}
        onclick={() => setMode(modeOption)}
      >
        {modeOption}
        {#if modeOption === 'system'}
          <p>({systemPrefersMode.current})</p>
        {/if}
      </button>
    {/each}
  </div>
</div>

<div class='mb-7.25'>
  <h3 class='mb-3.25 text-[11px] font-[550]'>Canvas</h3>
  <ThemeGallery />
</div>

<div class='mb-7.25'>
  <h3 class='mb-3.25 text-[11px] font-[550]'>Tile density</h3>
  <div class='mb-2.25 flex rounded-sm border border-(--line) p-0.75'>
    {#each densities as density (density)}
      <button
        class='
          flex-1 rounded-[3px] bg-transparent p-2.25 text-[10px] text-(--muted) capitalize
          aria-pressed:bg-(--surface-hover) aria-pressed:text-(--text)
        '
        aria-pressed={settings.density === density}
        disabled={command.busy}
        onclick={() => setting({ density })}
      >
        {density}
      </button>
    {/each}
  </div>
  <p class='m-0 text-[11px] leading-[1.65] text-(--muted)'>
    Coordinates stay the same. Just a little more breathing room.
  </p>
</div>

<div class='mb-7.25'>
  <div class='flex flex-col'>
    <label class='mb-5.75 flex items-center justify-between gap-3.75 text-[11px]'>
      <span>
        Show website addresses
        <small class='mt-1.75 block text-[10px] text-(--muted)'>
          A little context below each title.
        </small>
      </span>
      <input
        type='checkbox'
        role='switch'
        checked={settings.showDomains}
        disabled={command.busy}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-[20px] bg-(--line)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted)
          before:transition-transform before:duration-130
          checked:bg-(--accent)
          checked:before:translate-x-3.25 checked:before:bg-(--accent-ink)
        '
        onchange={event => setting({ showDomains: event.currentTarget.checked })}
      />
    </label>
    <label class='mb-5.75 flex items-center justify-between gap-3.75 text-[11px]'>
      <span>
        Reduce motion
        <small class='mt-1.75 block text-[10px] text-(--muted)'>
          A quieter, more instant experience.
        </small>
      </span>
      <input
        type='checkbox'
        role='switch'
        checked={settings.reducedMotion}
        disabled={command.busy}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-[20px] bg-(--line)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted)
          before:transition-transform before:duration-130
          checked:bg-(--accent)
          checked:before:translate-x-3.25 checked:before:bg-(--accent-ink)
        '
        onchange={event => setting({ reducedMotion: event.currentTarget.checked })}
      />
    </label>
  </div>
</div>

<div class='mb-7.25'>
  <h3 class='mb-3.25 text-[11px] font-[550]'>A fresh arrangement</h3>
  <p class='m-0 text-[11px] leading-[1.65] text-(--muted)'>
    Reset positions to browser bookmark order. Your colors, sizes, and
    bookmarks stay intact.
  </p>
  {#if confirmReset}
    <div class='mt-3.5'>
      <p class='mb-3 text-[11px]'>Reset layouts for every group?</p>
      <Button
        variant='primary'
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

<div class='mb-7.25 border-t border-(--line) pt-5.5'>
  <h3 class='mb-3.25 text-[11px] font-[550]'>Factory reset</h3>
  <p class='mx-0 mt-0 mb-3.75 text-[11px] leading-[1.65] text-(--muted)'>
    Reset tile colors, sizes, placements, and display options. This also
    resets your theme and mode and clears Undo history. Your bookmarks
    stay. This cannot be undone.
  </p>
  {#if confirmFactory}
    <div class='mt-3.5'>
      <p class='mb-3 text-[11px]'>Reset Metro to factory defaults?</p>
      <Button disabled={command.busy} onclick={() => (confirmFactory = false)}>
        Cancel
      </Button>
      <Button
        variant='danger'
        disabled={command.busy}
        onclick={() => send({ type: 'factory.reset' })}
      >
        <Icon name='refresh' size={15} />
        Reset Metro
      </Button>
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

<DialogError error={command.error} />

<div class='flex gap-3 border-t border-(--line) pt-5.5 text-(--muted)'>
  <Icon name='lock' size={17} />
  <div>
    <strong class='text-[11px] font-medium text-(--text)'>Local by design.</strong>
    <p class='mt-1.75 text-[10px] leading-[1.8]'>
      No accounts. No analytics. No remote icon requests. Your bookmarks
      stay in your browser.
    </p>
  </div>
</div>

{#if isPreview}
  <div class='mt-7 rounded-sm border border-(--line) bg-(--bg) p-4.25'>
    <span class='text-[8px] tracking-[1.1px] text-(--muted)'>DEMO WORKSPACE</span>
    <p class='mt-2.25 mb-3.25 text-[10px] leading-[1.7] text-(--muted)'>
      This preview uses sample bookmarks, not your real browser data.
    </p>
    {#if confirmPreview}
      <Button disabled={command.busy} onclick={resetPreview}>
        Confirm demo reset
      </Button>
    {:else}
      <button
        class='bg-transparent p-0 text-[10px] text-(--accent)'
        onclick={() => (confirmPreview = true)}
      >
        Restore sample bookmarks
      </button>
    {/if}
  </div>
{/if}

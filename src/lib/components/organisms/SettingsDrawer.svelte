<script lang='ts'>
  import type { Settings } from '$lib/config'
  import type { Command } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import SettingsDialog from '$lib/components/organisms/editor/SettingsDialog.svelte'
  import { Button } from '$lib/components/ui/button'

  interface Props {
    /** Whether the drawer is expanded. The drawer stays mounted while closed. */
    open: boolean
    /** Current settings, or undefined while the snapshot has not loaded. */
    settings: Settings | undefined
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
    onresetpreview?: () => Promise<void>
  }

  const { open, settings, oncommand, onclose, onresetpreview }: Props = $props()
</script>

<aside
  class={[
    `flex h-dvh w-(--settings-width) shrink-0 flex-col overflow-hidden
    border-l border-(--border) bg-(--card) text-(--foreground) shadow-(--shadow)
    transition-[margin-right,opacity] duration-300
    will-change-[margin-right,opacity] motion-reduce:transition-none`,
    !open && '-mr-(--settings-width) opacity-0 pointer-events-none',
  ].filter(Boolean).join(' ')}
  style='--settings-width: min(40rem, calc(100vw - 4rem))'
  aria-label={$LL.settings.settings()}
  aria-hidden={!open}
  inert={!open}
>

  {#if settings}
    <header
      class='
        flex shrink-0 items-start justify-between gap-2.5 border-b border-(--border) px-4
        pt-7.25 pb-5
      '
    >
      <div>
        <div class='mb-2 text-[0.5rem] tracking-[0.5em] text-(--muted-foreground)'>
          {$LL.settings.makeYourselfAtHome()}
        </div>
        <h2 class='m-0 text-2xl font-normal tracking-tighter'>
          {$LL.settings.settings()}
        </h2>
      </div>
      <Button
        class='-mr-1.75'
        size='icon'
        variant='ghost'
        title={$LL.settings.closeSettings()}
        onclick={onclose}
      >
        <Icon name='close' size={18} />
      </Button>
    </header>
    <div class='flex min-h-0 flex-1 flex-col'>
      <SettingsDialog
        {settings}
        {oncommand}
        {onclose}
        {onresetpreview}
      />
    </div>
  {/if}

</aside>

<script lang='ts'>
  import type { Notice } from '$lib/types'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import IconButton from '$lib/components/molecules/IconButton.svelte'

  interface Props {
    notice: Notice
    onundo?: () => void
    onclose: () => void
  }

  const { notice, onundo, onclose }: Props = $props()
</script>

<div
  data-testid='toast'
  class='
    fixed bottom-19.5 left-1/2 z-80 flex max-w-[calc(100vw-32px)] -translate-x-1/2
    items-center gap-3 rounded-md border border-(--border) bg-(--card) py-2.75 pr-3 pl-4
    text-(--foreground) shadow-(--shadow)
  '
>
  <span
    data-testid='toast-icon'
    class='flex {notice.tone === 'error' ? 'text-(--destructive)' : 'text-(--success)'}'
  >
    <Icon name={notice.tone === 'error' ? 'close' : 'check'} size={16} />
  </span>
  <span
    data-testid='toast-message'
    class='max-w-105 text-xs leading-[1.6]'
    role='status'
    aria-live='polite'
  >{notice.message}</span>
  {#if onundo}
    <button
      data-testid='undo-button'
      class='
        ml-1 flex h-6.5 items-center gap-1.5 border-l border-(--border) bg-transparent
        pr-3.25 pl-4 text-xs whitespace-nowrap text-(--primary)
      '
      onclick={onundo}
    >
      <Icon name='undo' size={14} />{notice.actionLabel ?? 'Undo'}
    </button>
  {/if}
  <IconButton
    label='Dismiss notification'
    data-testid='toast-close'
    class='size-6.25! shrink-0'
    onclick={onclose}
  >
    <Icon name='close' size={14} />
  </IconButton>
</div>

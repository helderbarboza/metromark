<script lang='ts'>
  import type { Notice } from '../types'
  import Icon from './Icon.svelte'
  import IconButton from './IconButton.svelte'

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
    fixed bottom-[78px] left-1/2 z-80 flex max-w-[calc(100vw-32px)] -translate-x-1/2
    items-center gap-3 rounded-md border border-(--line) bg-(--surface) py-[11px] pr-3
    pl-4 text-(--text) shadow-(--shadow)
  '
>
  <span
    data-testid='toast-icon'
    class='flex {notice.tone === 'error' ? 'text-(--danger)' : 'text-[#99b594]'}'
  >
    <Icon name={notice.tone === 'error' ? 'close' : 'check'} size={16} />
  </span>
  <span
    data-testid='toast-message'
    class='max-w-[420px] text-[11px] leading-[1.6]'
    role='status'
    aria-live='polite'
  >{notice.message}</span>
  {#if onundo}
    <button
      data-testid='undo-button'
      class='
        ml-1 flex h-[26px] items-center gap-1.5 border-l border-(--line) bg-transparent
        pr-[13px] pl-4 text-[11px] whitespace-nowrap text-(--accent)
      '
      onclick={onundo}
    >
      <Icon name='undo' size={14} />Undo
    </button>
  {/if}
  <IconButton
    label='Dismiss notification'
    data-testid='toast-close'
    class='size-[25px]! shrink-0'
    onclick={onclose}
  >
    <Icon name='close' size={14} />
  </IconButton>
</div>

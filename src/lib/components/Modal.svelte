<script lang='ts'>
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import Icon from './Icon.svelte'

  interface Props {
    title: string
    eyebrow?: string
    children: Snippet
    onclose: () => void
    drawer?: boolean
  }

  const { title, eyebrow = 'YOUR BOOKMARKS', children, onclose, drawer = false }: Props = $props()

  let element: HTMLDialogElement
  onMount(() => {
    element.showModal()
    const field = element.querySelector<HTMLElement>('[data-initial-focus]')
    field?.focus()
    return () => element.close()
  })
  function backdrop(event: PointerEvent) {
    const rect = element.getBoundingClientRect()
    if (
      event.target === element
      && (event.clientX < rect.left
        || event.clientX > rect.right
        || event.clientY < rect.top
        || event.clientY > rect.bottom)
    ) {
      onclose()
    }
  }
  function cancel(event: Event) {
    event.preventDefault()
    onclose()
  }
</script>

<dialog
  bind:this={element}
  class:drawer
  aria-label={title}
  oncancel={cancel}
  onpointerdown={backdrop}
>
  <div class='modal-content'>
    <header class='modal-header'>
      <div>
        <div class='modal-eyebrow'>{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      <button class='icon-button' aria-label='Close dialog' onclick={onclose}><Icon name='close' size={18} /></button>
    </header>
    {@render children()}
  </div>
</dialog>

<style>
  dialog {
    width: min(480px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface);
    color: var(--text);
    margin: auto;
    box-shadow: var(--shadow);
    overflow: auto;
  }
  dialog::backdrop {
    background: #05070bc4;
    backdrop-filter: blur(6px);
  }
  .modal-content {
    padding: 29px 30px 30px;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 26px;
  }
  .modal-eyebrow {
    font-size: 8px;
    color: var(--muted);
    letter-spacing: 1.7px;
    margin-bottom: 8px;
  }
  h2 {
    font-weight: 450;
    font-size: 26px;
    letter-spacing: -1px;
    margin: 0;
  }
  .modal-header .icon-button {
    margin-right: -7px;
  }
  dialog.drawer {
    position: fixed;
    inset: 12px 12px 12px auto;
    margin: 0;
    width: min(410px, calc(100vw - 24px));
    height: calc(100vh - 24px);
    max-height: none;
    border-radius: 7px;
  }
  @media (max-width: 480px) {
    .modal-content {
      padding: 24px;
    }
  }
</style>

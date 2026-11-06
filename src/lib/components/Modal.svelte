<script lang='ts'>
  import type { Snippet } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import IconButton from '$lib/components/IconButton.svelte'
  import { onMount } from 'svelte'

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
  class={[
    'p-0 border border-(--border) bg-(--card) text-(--foreground) shadow-(--shadow) overflow-auto',
    'backdrop:bg-black/40 backdrop:backdrop-blur-[1px]',
    drawer && 'fixed top-3 right-3 bottom-3 left-auto m-0',
    drawer && 'w-[min(410px,calc(100vw-24px))] h-[calc(100vh-24px)] max-h-none rounded-[7px]',
    !drawer && 'w-[min(480px,calc(100vw-32px))] max-h-[calc(100vh-48px)] m-auto rounded-[9px]',
  ].filter(Boolean).join(' ')}
  aria-label={title}
  oncancel={cancel}
  onpointerdown={backdrop}
>
  <div class='px-7.5 pt-7.25 pb-7.5 max-[480px]:p-6'>
    <header class='mb-6.5 flex items-center justify-between gap-2.5'>
      <div>
        <div class='mb-2 text-[0.5rem] tracking-[1.7px] text-(--muted-foreground)'>{eyebrow}</div>
        <h2 class='m-0 text-2xl font-[450] tracking-[-1px]'>{title}</h2>
      </div>
      <IconButton class='-mr-1.75' label='Close dialog' onclick={onclose}>
        <Icon name='close' size={18} />
      </IconButton>
    </header>
    {@render children()}
  </div>
</dialog>

<script lang='ts'>
  import type { Snippet } from 'svelte'
  import LL from '$i18n/i18n-svelte'
  import * as Dialog from '$lib/components/ui/dialog'

  interface Props {
    title: string
    /** Override for the small eyebrow line; defaults to the translated "YOUR BOOKMARKS". */
    eyebrow?: string
    children: Snippet
    onclose: () => void
  }

  const { title, eyebrow, children, onclose }: Props = $props()

  let open = $state(true)
  let content = $state<HTMLElement | null>(null)

  function handleOpenChange(value: boolean): void {
    if (!value) {
      open = false
      onclose()
    }
  }

  function handleOpenAutoFocus(event: Event): void {
    // Preserve the old behavior: land focus on `[data-initial-focus]` when the
    // dialog has one (e.g. the title field in the bookmark dialog).
    const field = content?.querySelector<HTMLElement>('[data-initial-focus]')
    if (field) {
      event.preventDefault()
      field.focus({ preventScroll: true })
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content
    bind:ref={content}
    onOpenAutoFocus={handleOpenAutoFocus}
  >
    <Dialog.Header>
      <div class='mb-2 text-[0.5rem] tracking-[0.5em] text-(--muted-foreground)'>{eyebrow ?? $LL.dialogs.yourBookmarks()}</div>
      <Dialog.Title class='text-2xl font-normal'>{title}</Dialog.Title>
    </Dialog.Header>
    {@render children()}
  </Dialog.Content>
</Dialog.Root>

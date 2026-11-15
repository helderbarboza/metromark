<script lang='ts'>
  import DialogActions from '$lib/components/molecules/DialogActions.svelte'
  import { Button } from '$lib/components/ui/button'

  const { url, onclose }: { url: string, onclose: () => void } = $props()
</script>

<p class='mb-6.5 text-[13px] leading-[1.8] text-(--muted-foreground)'>
  Clipboard access isn't available here. Select the address and press
  Ctrl/Cmd+C.
</p>
<input
  class='
    h-11.25 w-full rounded-sm border border-(--border) bg-(--background) px-3.25
    text-[13px] text-(--foreground) outline-offset-1
  '
  data-initial-focus
  readonly
  value={url}
  aria-label='Website address to copy'
  onfocus={event => event.currentTarget.select()}
/>
<DialogActions>
  <Button variant='default' onclick={onclose}>Done</Button>
</DialogActions>

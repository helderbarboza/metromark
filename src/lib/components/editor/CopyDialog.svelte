<script lang='ts'>
  import Button from '../Button.svelte'
  import DialogActions from './DialogActions.svelte'

  const { url, onclose }: { url: string, onclose: () => void } = $props()
</script>

<p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
  Clipboard access isn't available here. Select the address and press
  Ctrl/Cmd+C.
</p>
<input
  class='
    h-[45px] w-full rounded-sm border border-(--line) bg-(--bg) px-[13px] text-[13px]
    text-(--text) outline-offset-1
  '
  data-initial-focus
  readonly
  value={url}
  aria-label='Website address to copy'
  onfocus={event => event.currentTarget.select()}
/>
<DialogActions>
  <Button variant='primary' onclick={onclose}>Done</Button>
</DialogActions>

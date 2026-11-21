<script lang='ts'>
  import LL from '$i18n/i18n-svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'

  const { url, onclose }: { url: string, onclose: () => void } = $props()
</script>

<p class='mb-6.5 text-xs/relaxed text-(--muted-foreground)'>
  {$LL.dialogs.copyIntro()}
</p>
<Input
  data-initial-focus
  readonly
  value={url}
  aria-label={$LL.dialogs.websiteAddressToCopy()}
  onfocus={event => event.currentTarget.select()}
/>
<Dialog.Footer>
  <Button variant='default' onclick={onclose}>{$LL.dialogs.done()}</Button>
</Dialog.Footer>

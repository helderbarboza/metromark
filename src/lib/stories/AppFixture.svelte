<script lang='ts'>
  import { createPreviewClient } from '$lib/adapters/preview'
  import { SETTINGS_DEFAULTS } from '$lib/config'
  import { onMount } from 'svelte'
  import App from '../../App.svelte'

  const {
    compact = false,
  }: { compact?: boolean } = $props()
  const density = $derived(compact ? 'compact' : 'comfortable')
  const client = $derived(
    createPreviewClient({ ...SETTINGS_DEFAULTS, density, reducedMotion: true }),
  )
  let ready = $state(false)

  onMount(() => {
    let cancelled = false
    void client.execute({
      type: 'settings.update',
      patch: { density: compact ? 'compact' : 'comfortable', reducedMotion: true },
    }).then(() => {
      if (!cancelled)
        ready = true
    })
    return () => {
      cancelled = true
      client.dispose()
    }
  })
</script>
<div style='width:100vw;height:100vh'>{#if ready}<App {client} />{/if}</div>

<script lang='ts'>
  import type { ThemeName } from '../types'
  import { setTheme } from 'mode-watcher'
  import { onMount } from 'svelte'
  import App from '../../App.svelte'
  import { createPreviewClient } from '../adapters/preview'
  import { SETTINGS_DEFAULTS } from '../config'

  const { theme = 'catppuccin-mocha', compact = false }: { theme?: ThemeName, compact?: boolean } = $props()
  const density = compact ? 'compact' : 'comfortable'
  const client = createPreviewClient({ ...SETTINGS_DEFAULTS, density, reducedMotion: true })
  let ready = $state(false)
  onMount(() => {
    let cancelled = false
    setTheme(theme)
    void client.execute({ type: 'settings.update', patch: { density: compact ? 'compact' : 'comfortable', reducedMotion: true } }).then(() => {
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

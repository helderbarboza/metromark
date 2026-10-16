<script lang="ts">
  import { onMount } from 'svelte';
  import App from '../../App.svelte';
  import { createPreviewClient } from '../adapters/preview';
  import type { Settings } from '../types';
  import type { Density } from '../types';
  let { theme = 'midnight', density = 'default' }: { theme?: Settings['theme']; density?: Density } = $props();
  const client = createPreviewClient(false);
  let ready = $state(false);
  onMount(() => {
    let cancelled = false;
    void client.execute({ type: 'settings.update', patch: { theme, density, reducedMotion: true } }).then(() => { if (!cancelled) ready = true; });
    return () => { cancelled = true; client.dispose(); };
  });
</script>
<div style="width:100vw;height:100vh">{#if ready}<App {client} />{/if}</div>

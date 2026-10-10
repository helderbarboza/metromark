<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from '../components/Editor.svelte';
  import type { DialogSpec } from '../components/Editor.svelte';
  import type { Snapshot } from '../types';
  import { createPreviewClient } from '../adapters/preview';
  let { kind = 'bookmark', id }: { kind?: DialogSpec['kind']; id?: string } = $props();
  const client = createPreviewClient(false);
  let snapshot = $state.raw<Snapshot | null>(null);
  let open = $state(true);
  onMount(() => { void client.snapshot().then((value) => snapshot = value); return () => client.dispose(); });
</script>
<div style="width:100vw;height:100vh;background:var(--bg);padding:32px">
  <button class="button" onclick={() => open = true}>Open editor</button>
  {#if snapshot && open}<Editor spec={{ kind, id, parentId: 'bar' }} {snapshot} onclose={() => open = false} oncommand={async (command) => { snapshot = (await client.execute(command)).snapshot; return true; }} />{/if}
</div>

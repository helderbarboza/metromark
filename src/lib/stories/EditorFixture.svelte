<script lang='ts'>
  import type { DialogSpec } from '../components/Editor.svelte'
  import type { Command, Snapshot } from '../types'
  import { onMount } from 'svelte'
  import { createPreviewClient } from '../adapters/preview'
  import Button from '../components/Button.svelte'
  import Editor from '../components/Editor.svelte'
  import { SETTINGS_DEFAULTS } from '../config'

  const { kind = 'bookmark', id }: { kind?: DialogSpec['kind'], id?: string } = $props()
  const client = createPreviewClient(SETTINGS_DEFAULTS)
  let snapshot = $state.raw<Snapshot | null>(null)
  let open = $state(true)
  async function command(command: Command) {
    snapshot = (await client.execute(command)).snapshot
    return true
  }
  onMount(() => {
    void client.snapshot().then(value => snapshot = value)
    return () => client.dispose()
  })
</script>
<div style='width:100vw;height:100vh;background:var(--bg);padding:32px'>
  <Button onclick={() => open = true}>Open editor</Button>
  {#if snapshot && open}
    <Editor
      spec={{ kind, id, parentId: 'bar' }}
      {snapshot}
      onclose={() => open = false}
      oncommand={command}
    />
  {/if}
</div>

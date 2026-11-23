<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type { Command, Snapshot } from '$lib/types'
  import { createPreviewClient } from '$lib/adapters/preview'
  import Editor from '$lib/components/organisms/Editor.svelte'
  import SettingsDialog from '$lib/components/organisms/editor/SettingsDialog.svelte'
  import { Button } from '$lib/components/ui/button'
  import { SETTINGS_DEFAULTS } from '$lib/config'
  import { setSnapshot } from '$lib/snapshot-context'
  import { onMount } from 'svelte'

  interface Props {
    kind?: DialogSpec['kind']
    id?: string
    undoId?: string
  }

  const { kind = 'bookmark', id, undoId }: Props = $props()
  const client = createPreviewClient(SETTINGS_DEFAULTS)
  let snapshot = $state.raw<Snapshot | null>(null)
  let open = $state(true)
  // The editor reads the snapshot from context instead of a prop.
  setSnapshot(() => snapshot)
  async function command(command: Command) {
    snapshot = (await client.execute(command)).snapshot
    return true
  }
  onMount(() => {
    void client.snapshot().then(value => snapshot = value)
    return () => client.dispose()
  })
</script>
<div style='width:100vw;height:100vh;background:var(--background);padding:32px'>
  <Button onclick={() => open = true}>Open editor</Button>
  {#if snapshot && open}
    {#if kind === 'settings'}
      <div
        class='
          fixed inset-y-3 right-3 w-[min(410px,calc(100vw-24px))] overflow-auto border
          border-(--border) bg-(--card) p-7.5 text-(--foreground) shadow-(--shadow)
        '
      >
        <SettingsDialog
          settings={snapshot.settings}
          oncommand={command}
          onclose={() => open = false}
        />
      </div>
    {:else}
      <Editor
        spec={{ kind, id, parentId: 'bar', undoId }}
        onclose={() => open = false}
        oncommand={command}
      />
    {/if}
  {/if}
</div>

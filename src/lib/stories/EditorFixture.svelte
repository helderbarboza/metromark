<script lang='ts'>
  import type { DialogSpec } from '$lib/components/editor/dialog-spec'
  import type { Command, Snapshot } from '$lib/types'
  import { createPreviewClient } from '$lib/adapters/preview'
  import Button from '$lib/components/Button.svelte'
  import Editor from '$lib/components/Editor.svelte'
  import SettingsDialog from '$lib/components/editor/SettingsDialog.svelte'
  import { SETTINGS_DEFAULTS } from '$lib/config'
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
    {#if kind === 'settings'}
      <div
        class='
          fixed inset-y-3 right-3 w-[min(410px,calc(100vw-24px))] overflow-auto border
          border-(--line) bg-(--surface) p-7.5 text-(--text) shadow-(--shadow)
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
        {snapshot}
        onclose={() => open = false}
        oncommand={command}
      />
    {/if}
  {/if}
</div>

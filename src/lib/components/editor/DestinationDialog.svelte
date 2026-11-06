<script lang='ts'>
  import type { DialogSpec } from '$lib/components/editor/dialog-spec'
  import type { BookmarkNode, Command, Snapshot } from '$lib/types'
  import { createDialogCommand } from '$lib/components/editor/dialog-command.svelte'
  import { destinationGroups, writableGroups } from '$lib/components/editor/dialog-spec'
  import DialogActions from '$lib/components/editor/DialogActions.svelte'
  import DialogError from '$lib/components/editor/DialogError.svelte'
  import FolderSelect from '$lib/components/editor/FolderSelect.svelte'
  import { Button } from '$lib/components/ui/button'
  import { onMount } from 'svelte'

  const {
    spec,
    snapshot,
    node,
    oncommand,
    onclose,
  }: {
    spec: DialogSpec
    snapshot: Snapshot
    node?: BookmarkNode
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
  } = $props()

  const { state: command, send } = createDialogCommand(oncommand, onclose)

  let parentId = $state('')

  const isRestore = $derived(spec.kind === 'restore')
  const folders = $derived(isRestore ? writableGroups(snapshot) : destinationGroups(snapshot, node))

  onMount(() => {
    parentId = spec.parentId ?? node?.parentId ?? folders[0]?.id ?? ''
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (command.busy)
      return
    if (isRestore) {
      if (spec.undoId)
        return send({ type: 'undo', id: spec.undoId, parentId })
      return
    }
    if (node)
      return send({ type: 'node.move', id: node.id, parentId })
  }
</script>

<form onsubmit={submit}>
  <p class='mb-6.5 text-[13px] leading-[1.8] text-(--muted-foreground)'>
    {#if isRestore}
      The original folder is no longer available. Choose a writable
      destination to restore this item.
    {:else}
      Move <strong class='text-(--foreground)'>{node?.title}</strong> to another folder.
      This changes its location in your browser bookmarks.
    {/if}
  </p>
  <FolderSelect
    folders={folders}
    bind:value={parentId}
    label='Folder'
    initialFocus={true}
  />
  <DialogError error={command.error} />
  <DialogActions>
    <Button type='button' onclick={onclose}>Cancel</Button>
    <Button
      variant='default'
      type='submit'
      disabled={command.busy || !parentId}
    >
      {command.busy
        ? 'Saving…'
        : isRestore
        ? 'Restore here'
        : 'Move here'}
    </Button>
  </DialogActions>
</form>

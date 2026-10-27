<script lang='ts'>
  import type { BookmarkNode, Command, Snapshot } from '../../types'
  import type { DialogSpec } from './dialog-spec'
  import { onMount } from 'svelte'
  import Button from '../Button.svelte'
  import { createDialogCommand } from './dialog-command.svelte'
  import { destinationGroups, writableGroups } from './dialog-spec'
  import DialogActions from './DialogActions.svelte'
  import DialogError from './DialogError.svelte'
  import FolderSelect from './FolderSelect.svelte'

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
  <p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
    {#if isRestore}
      The original folder is no longer available. Choose a writable
      destination to restore this item.
    {:else}
      Move <strong class='text-(--text)'>{node?.title}</strong> to another folder.
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
      variant='primary'
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

<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type { BookmarkNode, Command, Snapshot } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import DialogActions from '$lib/components/molecules/DialogActions.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import FolderSelect from '$lib/components/molecules/FolderSelect.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { destinationGroups, writableGroups } from '$lib/components/organisms/editor/dialog-spec'
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

  const { state: command, send } = createDialogCommand(
    command => oncommand(command),
    () => onclose(),
  )

  let parentId = $state('')

  const isRestore = $derived(spec.kind === 'restore')
  const folders = $derived(isRestore
    ? writableGroups(snapshot)
    : destinationGroups(snapshot, node))

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
  <p class='mb-6.5 text-xs/relaxed text-(--muted-foreground)'>
    {#if isRestore}
      {$LL.dialogs.restoreIntro()}
    {:else}
      {@const [moveBefore, moveAfter] = $LL.dialogs.moveIntro().split('<>')}
      {moveBefore}<strong class='text-(--foreground)'>{node?.title}</strong>{moveAfter}
    {/if}
  </p>
  <FolderSelect
    folders={folders}
    bind:value={parentId}
    label={$LL.dialogs.folder()}
    initialFocus={true}
  />
  <DialogError error={command.error} />
  <DialogActions>
    <Button type='button' onclick={onclose}>{$LL.dialogs.cancel()}</Button>
    <Button
      variant='default'
      type='submit'
      disabled={command.busy || !parentId}
    >
      {command.busy
        ? $LL.dialogs.saving()
        : isRestore
        ? $LL.dialogs.restoreHere()
        : $LL.dialogs.moveHere()}
    </Button>
  </DialogActions>
</form>

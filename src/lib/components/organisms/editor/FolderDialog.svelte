<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type { BookmarkNode, Command, Snapshot } from '$lib/types'
  import DialogActions from '$lib/components/molecules/DialogActions.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import FolderSelect from '$lib/components/molecules/FolderSelect.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { writableGroups } from '$lib/components/organisms/editor/dialog-spec'
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

  let name = $state('')
  let parentId = $state('')

  const folders = $derived(writableGroups(snapshot))

  onMount(() => {
    name = node?.title ?? ''
    parentId = spec.parentId ?? folders[0]?.id ?? ''
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (command.busy)
      return
    if (spec.kind === 'rename') {
      if (node)
        return send({ type: 'node.update', id: node.id, title: name })
      return
    }
    return send({ type: 'folder.create', parentId, title: name })
  }

  const isRename = $derived(spec.kind === 'rename')
</script>

<form onsubmit={submit}>
  <p class='mb-6.5 text-[13px] leading-[1.8] text-(--muted-foreground)'>
    {isRename
      ? 'Only this folder’s name changes. Descendant group paths update automatically.'
      : 'A bookmark folder becomes a tile group. Nested folders get their own group, too.'}
  </p>
  <label class='mb-5.25 flex flex-col gap-2.25'>
    <span class='text-[12px] font-medium text-(--foreground)'>Folder name</span>
    <input
      data-initial-focus
      bind:value={name}
      required
      maxlength='2048'
      placeholder='e.g. Weekend reading'
      autocomplete='off'
      class='
        h-11.25 w-full rounded-sm border border-(--border) bg-(--background) px-3.25
        text-[13px] text-(--foreground) outline-offset-1
        placeholder:text-(--muted-foreground) placeholder:opacity-60
      '
    />
  </label>
  {#if !isRename}
    <FolderSelect folders={folders} bind:value={parentId} label='Create inside' />
  {/if}
  <DialogError error={command.error} />
  <DialogActions>
    <Button type='button' onclick={onclose}>Cancel</Button>
    <Button
      variant='default'
      type='submit'
      disabled={command.busy || (!isRename && !parentId)}
    >
      {command.busy
        ? 'Saving…'
        : isRename
        ? 'Save changes'
        : 'Create group'}
    </Button>
  </DialogActions>
</form>

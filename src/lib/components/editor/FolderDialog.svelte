<script lang='ts'>
  import type { DialogSpec } from '$lib/components/editor/dialog-spec'
  import type { BookmarkNode, Command, Snapshot } from '$lib/types'
  import Button from '$lib/components/Button.svelte'
  import { createDialogCommand } from '$lib/components/editor/dialog-command.svelte'
  import { writableGroups } from '$lib/components/editor/dialog-spec'
  import DialogActions from '$lib/components/editor/DialogActions.svelte'
  import DialogError from '$lib/components/editor/DialogError.svelte'
  import FolderSelect from '$lib/components/editor/FolderSelect.svelte'
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
  <p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
    {isRename
      ? 'Only this folder’s name changes. Descendant group paths update automatically.'
      : 'A bookmark folder becomes a tile group. Nested folders get their own group, too.'}
  </p>
  <label class='mb-[21px] flex flex-col gap-[9px]'>
    <span class='text-[12px] font-medium text-(--text)'>Folder name</span>
    <input
      data-initial-focus
      bind:value={name}
      required
      maxlength='2048'
      placeholder='e.g. Weekend reading'
      autocomplete='off'
      class='
        h-[45px] w-full rounded-sm border border-(--line) bg-(--bg) px-[13px] text-[13px]
        text-(--text) outline-offset-1
        placeholder:text-(--muted) placeholder:opacity-60
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
      variant='primary'
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

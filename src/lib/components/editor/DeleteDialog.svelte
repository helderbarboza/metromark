<script lang='ts'>
  import type { BookmarkNode, Command } from '$lib/types'
  import Button from '$lib/components/Button.svelte'
  import { createDialogCommand } from '$lib/components/editor/dialog-command.svelte'
  import DialogActions from '$lib/components/editor/DialogActions.svelte'
  import DialogError from '$lib/components/editor/DialogError.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { countBookmarks, flatten, isFolder } from '$lib/tree'

  const {
    node,
    mode,
    oncommand,
    onclose,
  }: {
    node: BookmarkNode
    mode: 'preview' | 'extension'
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
  } = $props()

  const { state: command, send } = createDialogCommand(oncommand, onclose)

  async function remove() {
    return send({ type: 'node.remove', id: node.id })
  }
</script>

<p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
  Delete <strong class='text-(--text)'>{node.title}</strong> and everything
  inside it? This removes the folder from {mode === 'preview'
    ? 'this demo workspace'
    : 'your browser bookmarks'} too.
</p>
<div
  class='
    mb-[21px] flex items-center gap-[15px] rounded-sm border border-(--line) bg-(--bg) p-5
  '
>
  <Icon name='folder' size={24} />
  <div>
    <strong class='mb-[5px] block text-[13px] font-medium'>{countBookmarks(node)} bookmarks</strong>
    <span class='text-[11px] text-(--muted)'>
      {flatten([node]).filter(isFolder).length - 1} nested folders
    </span>
  </div>
</div>
<p class='m-0 text-[11px] leading-[1.65] text-(--muted)'>
  You can Undo for 30 seconds. Restored bookmarks receive new browser IDs.
</p>
<DialogError error={command.error} />
<DialogActions>
  <Button type='button' onclick={onclose}>Keep folder</Button>
  <Button
    variant='danger'
    disabled={command.busy}
    onclick={remove}
  >
    <Icon name='delete' size={15} />
    {command.busy ? 'Deleting…' : 'Delete folder'}
  </Button>
</DialogActions>

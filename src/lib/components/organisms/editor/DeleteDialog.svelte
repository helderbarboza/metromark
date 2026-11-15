<script lang='ts'>
  import type { BookmarkNode, Command } from '$lib/types'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import DialogActions from '$lib/components/molecules/DialogActions.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { Button } from '$lib/components/ui/button'
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

  const { state: command, send } = createDialogCommand(
    command => oncommand(command),
    () => onclose(),
  )

  async function remove() {
    return send({ type: 'node.remove', id: node.id })
  }
</script>

<p class='mb-6.5 text-[13px] leading-[1.8] text-(--muted-foreground)'>
  Delete <strong class='text-(--foreground)'>{node.title}</strong> and everything
  inside it? This removes the folder from {mode === 'preview'
    ? 'this demo workspace'
    : 'your browser bookmarks'} too.
</p>
<div
  class='
    mb-5.25 flex items-center gap-3.75 rounded-sm border border-(--border)
    bg-(--background) p-5
  '
>
  <Icon name='folder' size={24} />
  <div>
    <strong class='mb-1.25 block text-[13px] font-medium'>{countBookmarks(node)} bookmarks</strong>
    <span class='text-xs text-(--muted-foreground)'>
      {flatten([node]).filter(isFolder).length - 1} nested folders
    </span>
  </div>
</div>
<p class='m-0 text-xs leading-[1.65] text-(--muted-foreground)'>
  You can Undo for 30 seconds. Restored bookmarks receive new browser IDs.
</p>
<DialogError error={command.error} />
<DialogActions>
  <Button type='button' onclick={onclose}>Keep folder</Button>
  <Button
    variant='destructive'
    disabled={command.busy}
    onclick={remove}
  >
    <Icon name='delete' size={15} />
    {command.busy ? 'Deleting…' : 'Delete folder'}
  </Button>
</DialogActions>

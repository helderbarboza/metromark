<script lang='ts'>
  import type { BookmarkNode, Command } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
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

  const introParts = $derived.by(() => $LL.dialogs.deleteIntro({
    target: mode === 'preview'
      ? $LL.dialogs.demoWorkspaceTarget()
      : $LL.dialogs.browserBookmarksTarget(),
  }).split('<>'))

  async function remove() {
    return send({ type: 'node.remove', id: node.id })
  }
</script>

<p class='mb-6.5 text-xs/relaxed text-(--muted-foreground)'>
  {introParts[0]}<strong class='text-(--foreground)'>{node.title}</strong>{introParts[1]}
</p>
<div
  class='
    mb-5.25 flex items-center gap-3.75 rounded-sm border border-(--border)
    bg-(--background) p-5
  '
>
  <Icon name='folder' size={24} />
  <div>
    <strong class='mb-1.25 block text-xs font-medium'>{$LL.dialogs.bookmarkCount({
      count: countBookmarks(node),
    })}</strong>
    <span class='text-xs text-(--muted-foreground)'>
      {$LL.dialogs.nestedFolderCount({ count: flatten([node]).filter(isFolder).length - 1 })}
    </span>
  </div>
</div>
<p class='m-0 text-xs/relaxed text-(--muted-foreground)'>
  {$LL.dialogs.undoHint()}
</p>
<DialogError error={command.error} />
<Dialog.Footer>
  <Button type='button' onclick={onclose}>{$LL.dialogs.keepFolder()}</Button>
  <Button
    variant='destructive'
    disabled={command.busy}
    onclick={remove}
  >
    <Icon name='delete' size={15} />
    {command.busy
      ? $LL.dialogs.deleting()
      : $LL.dialogs.deleteFolder()}
  </Button>
</Dialog.Footer>

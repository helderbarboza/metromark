<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type { BookmarkNode, Command, Snapshot } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import ColorSwatches from '$lib/components/molecules/ColorSwatches.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import FolderSelect from '$lib/components/molecules/FolderSelect.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { writableGroups } from '$lib/components/organisms/editor/dialog-spec'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { getThemeAccentColors } from '$lib/theme-colors'
  import { theme } from 'mode-watcher'
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
  let colorIndex = $state(-1)
  let customColor = $state('')
  let colorPicked = $state(false)

  const folders = $derived(writableGroups(snapshot))
  const themeColors = $derived.by(() => {
    void theme.current
    return getThemeAccentColors()
  })

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
    const color: { colorIndex?: number, color?: string } = {}
    if (colorPicked) {
      if (customColor)
        color.color = customColor
      else
        color.colorIndex = colorIndex
    }
    return send({
      type: 'folder.create',
      parentId,
      title: name,
      ...color,
    })
  }

  const isRename = $derived(spec.kind === 'rename')
</script>

<form onsubmit={submit}>
  <p class='mb-6.5 text-xs/relaxed text-(--muted-foreground)'>
    {isRename
      ? $LL.dialogs.renameIntro()
      : $LL.dialogs.createGroupIntro()}
  </p>
  <label class='mb-5.25 flex flex-col gap-2.25'>
    <span class='text-xs font-medium text-(--foreground)'>{$LL.dialogs.folderName()}</span>
    <Input
      data-initial-focus
      bind:value={name}
      required
      maxlength={2048}
      placeholder={$LL.dialogs.folderNamePlaceholder()}
      autocomplete='off'
    />
  </label>
  {#if !isRename}
    <FolderSelect folders={folders} bind:value={parentId} label={$LL.dialogs.createInside()} />
    <ColorSwatches
      colors={themeColors}
      bind:colorIndex
      bind:customColor
      onpick={() => (colorPicked = true)}
    />
  {/if}
  <DialogError error={command.error} />
  <Dialog.Footer>
    <Button type='button' onclick={onclose}>{$LL.dialogs.cancel()}</Button>
    <Button
      variant='default'
      type='submit'
      disabled={command.busy || (!isRename && !parentId)}
    >
      {command.busy
        ? $LL.dialogs.saving()
        : isRename
        ? $LL.dialogs.saveChanges()
        : $LL.dialogs.createGroup()}
    </Button>
  </Dialog.Footer>
</form>

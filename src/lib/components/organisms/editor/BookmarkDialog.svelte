<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type { BookmarkNode, Command, Snapshot } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import ColorSwatches from '$lib/components/molecules/ColorSwatches.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import FolderSelect from '$lib/components/molecules/FolderSelect.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { writableGroups } from '$lib/components/organisms/editor/dialog-spec'
  import { Button } from '$lib/components/ui/button'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { suggestAccentIndex } from '$lib/favicon-cache'
  import { getThemeAccentColors } from '$lib/theme-colors'
  import { projectGroups } from '$lib/tree'
  import { theme } from 'mode-watcher'
  import { onDestroy, onMount } from 'svelte'

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
  let url = $state('')
  let parentId = $state('')
  let colorIndex = $state(-1)
  let customColor = $state('')
  let colorPicked = $state(false)
  let disposed = false

  onDestroy(() => {
    disposed = true
  })

  const groups = $derived(projectGroups(snapshot))
  const folders = $derived(writableGroups(snapshot))

  const themeColors = $derived.by(() => {
    void theme.current
    return getThemeAccentColors()
  })

  onMount(() => {
    name = node?.title ?? ''
    url = node?.url ?? ''
    parentId = spec.parentId ?? node?.parentId ?? folders[0]?.id ?? ''
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (command.busy)
      return
    if (node) {
      return send({
        type: 'node.update',
        id: node.id,
        title: name,
        url,
      })
    }
    const color: { colorIndex?: number, color?: string } = {}
    if (colorPicked) {
      if (customColor)
        color.color = customColor
      else
        color.colorIndex = colorIndex
    }
    else {
      command.busy = true
      let suggested: number | undefined
      try {
        suggested = await suggestAccentIndex(url, themeColors)
      }
      catch {
        suggested = undefined
      }
      finally {
        command.busy = false
      }
      if (disposed)
        return
      if (suggested !== undefined)
        color.colorIndex = suggested
    }
    return send({
      type: 'bookmark.create',
      parentId,
      title: name,
      url,
      ...color,
    })
  }

  const currentGroup = $derived(groups.find(group => group.id === node?.parentId))
</script>

<form onsubmit={submit}>
  <p class='mb-6.5 text-xs/relaxed text-(--muted-foreground)'>
    {node
      ? $LL.dialogs.editIntro()
      : $LL.dialogs.createIntro()}
  </p>
  <label class='mb-5.25 flex flex-col gap-2.25'>
    <span class='text-xs font-medium text-(--foreground)'>{$LL.dialogs.title()}</span>
    <Input
      data-initial-focus
      bind:value={name}
      required
      maxlength={2048}
      placeholder={$LL.dialogs.titlePlaceholder()}
      autocomplete='off'
    />
  </label>
  <label class='mb-5.25 flex flex-col gap-2.25'>
    <span class='text-xs font-medium text-(--foreground)'>{$LL.dialogs.websiteAddress()}</span>
    <Input
      bind:value={url}
      required
      placeholder={$LL.dialogs.urlPlaceholder()}
      autocomplete='url'
      spellcheck='false'
    />
  </label>
  {#if !node}
    <FolderSelect folders={folders} bind:value={parentId} label={$LL.dialogs.folder()} />
    <ColorSwatches
      colors={themeColors}
      bind:colorIndex
      bind:customColor
      onpick={() => (colorPicked = true)}
    />
  {/if}
  {#if node}
    <div
      class='
        mb-5.25 flex items-center gap-2 text-[10px] leading-relaxed
        text-(--muted-foreground)
      '
    >
      <Icon name='folder' size={14} />
      <span>{currentGroup?.path.join(' / ')}</span>
    </div>
  {/if}
  <DialogError error={command.error} />
  <Dialog.Footer>
    <Button type='button' onclick={onclose}>{$LL.dialogs.cancel()}</Button>
    <Button
      variant='default'
      type='submit'
      disabled={command.busy || (!node && !parentId)}
    >
      {command.busy
        ? $LL.dialogs.saving()
        : !node
        ? $LL.dialogs.addBookmark()
        : $LL.dialogs.saveChanges()}
    </Button>
  </Dialog.Footer>
</form>

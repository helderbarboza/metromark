<script lang='ts'>
  import type { BookmarkNode, Command, Snapshot } from '../../types'
  import type { DialogSpec } from './dialog-spec'
  import { theme } from 'mode-watcher'
  import { onDestroy, onMount } from 'svelte'
  import { suggestAccentIndex } from '../../favicon-cache'
  import { getThemeAccentColors } from '../../theme-colors'
  import { projectGroups } from '../../tree'
  import Button from '../Button.svelte'
  import Icon from '../Icon.svelte'
  import { createDialogCommand } from './dialog-command.svelte'
  import { writableGroups } from './dialog-spec'
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

  let name = $state('')
  let url = $state('')
  let parentId = $state('')
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
      return send({ type: 'node.update', id: node.id, title: name, url })
    }
    command.busy = true
    let colorIndex: number | undefined
    try {
      colorIndex = await suggestAccentIndex(url, themeColors)
    }
    catch {
      colorIndex = undefined
    }
    finally {
      command.busy = false
    }
    if (disposed)
      return
    return send({ type: 'bookmark.create', parentId, title: name, url, colorIndex })
  }

  const currentGroup = $derived(groups.find(group => group.id === node?.parentId))
</script>

<form onsubmit={submit}>
  <p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
    {node
      ? 'Edit the real bookmark. Your tile arrangement stays right where it is.'
      : 'Save something worth coming back to.'}
  </p>
  <label class='mb-[21px] flex flex-col gap-[9px]'>
    <span class='text-[12px] font-medium text-(--text)'>Title</span>
    <input
      data-initial-focus
      bind:value={name}
      required
      maxlength='2048'
      placeholder='A name you’ll recognize'
      autocomplete='off'
      class='
        h-[45px] w-full rounded-sm border border-(--line) bg-(--bg) px-[13px]
        text-[13px] text-(--text) outline-offset-1
        placeholder:text-(--muted) placeholder:opacity-60
      '
    />
  </label>
  <label class='mb-[21px] flex flex-col gap-[9px]'>
    <span class='text-[12px] font-medium text-(--text)'>Website address</span>
    <input
      bind:value={url}
      required
      placeholder='https://example.com'
      autocomplete='url'
      spellcheck='false'
      class='
        h-[45px] w-full rounded-sm border border-(--line) bg-(--bg) px-[13px]
        text-[13px] text-(--text) outline-offset-1
        placeholder:text-(--muted) placeholder:opacity-60
      '
    />
  </label>
  {#if !node}
    <FolderSelect folders={folders} bind:value={parentId} label='Folder' />
  {/if}
  {#if node}
    <div
      class='
        mb-[21px] flex items-center gap-2 text-[10px] leading-[1.7]
        text-(--muted)
      '
    >
      <Icon name='folder' size={14} />
      <span>{currentGroup?.path.join(' / ')}</span>
    </div>
  {/if}
  <DialogError error={command.error} />
  <DialogActions>
    <Button type='button' onclick={onclose}>Cancel</Button>
    <Button
      variant='primary'
      type='submit'
      disabled={command.busy || (!node && !parentId)}
    >
      {command.busy
        ? 'Saving…'
        : !node
        ? 'Add bookmark'
        : 'Save changes'}
    </Button>
  </DialogActions>
</form>

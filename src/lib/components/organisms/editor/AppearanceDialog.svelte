<script lang='ts'>
  import type { BookmarkNode, Command, Snapshot, TileSize } from '$lib/types'

  import LL from '$i18n/i18n-svelte'
  import ColorSwatches from '$lib/components/molecules/ColorSwatches.svelte'
  import DialogActions from '$lib/components/molecules/DialogActions.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import { Button } from '$lib/components/ui/button'
  import { APPEARANCE_DEFAULTS } from '$lib/config'
  import { tileSizesForView } from '$lib/layout'
  import { getThemeAccentColors } from '$lib/theme-colors'
  import { tileFor, tileForFolder } from '$lib/tile'
  import { isFolder } from '$lib/tree'
  import { theme } from 'mode-watcher'
  import { onMount } from 'svelte'

  const {
    snapshot,
    node,
    oncommand,
    onclose,
  }: {
    snapshot: Snapshot
    node?: BookmarkNode
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
  } = $props()

  const { state: command, send } = createDialogCommand(
    command => oncommand(command),
    () => onclose(),
  )

  let size = $state<TileSize>(APPEARANCE_DEFAULTS.size)
  let colorIndex = $state(0)
  let customColor = $state('')

  const tile = $derived(node
    ? isFolder(node)
      ? tileForFolder(node, snapshot.appearance[node.id])
      : tileFor(node, snapshot.appearance[node.id])
    : undefined)
  const folder = $derived(node
    ? isFolder(node)
    : false)
  const sizeOptions = $derived(tileSizesForView(snapshot.settings.gridView))
  const introParts = $derived.by(() =>
    $LL.dialogs.appearanceIntro({
      target: folder
        ? $LL.dialogs.folderTarget()
        : $LL.dialogs.bookmarkTarget(),
    }).split('<>'),
  )

  const themeColors = $derived.by(() => {
    void theme.current
    return getThemeAccentColors()
  })

  onMount(() => {
    size = tile?.size === 'large' && !sizeOptions.includes('large')
      ? 'wide'
      : (tile?.size ?? APPEARANCE_DEFAULTS.size)
    colorIndex = tile?.colorIndex ?? APPEARANCE_DEFAULTS.colorIndex
    customColor = tile?.color ?? ''
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (command.busy)
      return
    if (node) {
      return send({
        type: 'tile.appearance',
        id: node.id,
        patch: {
          size,
          colorIndex: colorIndex === -1
            ? undefined
            : colorIndex,
          color: customColor,
        },
      })
    }
  }
</script>

<form onsubmit={submit}>
  {#if tile}
    <p class='mb-6.5 text-xs/relaxed text-(--muted-foreground)'>
      {introParts[0]}<strong class='text-(--foreground)'>{tile.title}</strong>{introParts[1]}
    </p>
    <label class='mb-5.25 flex flex-col gap-2.25'>
      <span class='text-xs font-medium text-(--foreground)' id='tile-size-label'>{$LL.dialogs.tileSize()}</span>
      <select
        aria-labelledby='tile-size-label'
        bind:value={size}
        data-initial-focus
        class='
          h-11.25 w-full rounded-sm border border-(--border) bg-(--background) px-3.25
          pr-7 text-xs text-(--foreground) outline-offset-1
        '
      >
        {#each sizeOptions as preset (preset)}
          <option value={preset}>{$LL.tileSizes[preset]()}</option>
        {/each}
      </select>
    </label>
    <ColorSwatches colors={themeColors} bind:colorIndex bind:customColor />
  {/if}
  <DialogError error={command.error} />
  <DialogActions>
    <Button type='button' onclick={onclose}>{$LL.dialogs.cancel()}</Button>
    <Button variant='default' type='submit' disabled={command.busy}>
      {command.busy
        ? $LL.dialogs.saving()
        : $LL.dialogs.saveChanges()}
    </Button>
  </DialogActions>
</form>

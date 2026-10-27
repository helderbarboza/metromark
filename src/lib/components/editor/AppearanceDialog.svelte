<script lang='ts'>
  import type { BookmarkNode, Command, Snapshot, TileSize } from '../../types'

  import { theme } from 'mode-watcher'
  import { onMount } from 'svelte'
  import { getThemeAccentColors } from '../../theme-colors'
  import { tileFor } from '../../tile'
  import Button from '../Button.svelte'
  import ColorSwatches from './ColorSwatches.svelte'
  import { createDialogCommand } from './dialog-command.svelte'
  import DialogActions from './DialogActions.svelte'
  import DialogError from './DialogError.svelte'

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

  const { state: command, send } = createDialogCommand(oncommand, onclose)

  let size = $state<TileSize>('medium')
  let colorIndex = $state(0)
  let customColor = $state('')

  const tile = $derived(node ? tileFor(node, snapshot.appearance[node.id]) : undefined)

  const themeColors = $derived.by(() => {
    void theme.current
    return getThemeAccentColors()
  })

  onMount(() => {
    size = tile?.size ?? 'medium'
    colorIndex = tile?.colorIndex ?? 0
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
          colorIndex: colorIndex === -1 ? undefined : colorIndex,
          color: customColor,
        },
      })
    }
  }
</script>

<form onsubmit={submit}>
  {#if tile}
    <p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
      A little personality for <strong class='text-(--text)'>{tile.title}</strong>.
      Appearance changes are local; the bookmark itself stays untouched.
    </p>
    <label class='mb-[21px] flex flex-col gap-[9px]'>
      <span class='text-[12px] font-medium text-(--text)' id='tile-size-label'>Tile size</span>
      <select
        aria-labelledby='tile-size-label'
        bind:value={size}
        data-initial-focus
        class='
          h-[45px] w-full rounded-sm border border-(--line) bg-(--bg) px-[13px] pr-7
          text-[13px] text-(--text) outline-offset-1
        '
      >
        {#each ['small', 'medium', 'wide', 'large'] as preset (preset)}
          <option value={preset}>{preset[0].toUpperCase() + preset.slice(1)}</option>
        {/each}
      </select>
    </label>
    <ColorSwatches colors={themeColors} bind:colorIndex bind:customColor />
  {/if}
  <DialogError error={command.error} />
  <DialogActions>
    <Button type='button' onclick={onclose}>Cancel</Button>
    <Button variant='primary' type='submit' disabled={command.busy}>
      {command.busy ? 'Saving…' : 'Save changes'}
    </Button>
  </DialogActions>
</form>

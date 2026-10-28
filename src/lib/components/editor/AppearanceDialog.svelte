<script lang='ts'>
  import type { BookmarkNode, Command, Snapshot, TileSize } from '$lib/types'

  import Button from '$lib/components/Button.svelte'
  import ColorSwatches from '$lib/components/editor/ColorSwatches.svelte'
  import { createDialogCommand } from '$lib/components/editor/dialog-command.svelte'
  import DialogActions from '$lib/components/editor/DialogActions.svelte'
  import DialogError from '$lib/components/editor/DialogError.svelte'
  import { getThemeAccentColors } from '$lib/theme-colors'
  import { tileFor } from '$lib/tile'
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
    <p class='mb-6.5 text-[13px] leading-[1.8] text-(--muted)'>
      A little personality for <strong class='text-(--text)'>{tile.title}</strong>.
      Appearance changes are local; the bookmark itself stays untouched.
    </p>
    <label class='mb-5.25 flex flex-col gap-2.25'>
      <span class='text-[12px] font-medium text-(--text)' id='tile-size-label'>Tile size</span>
      <select
        aria-labelledby='tile-size-label'
        bind:value={size}
        data-initial-focus
        class='
          h-11.25 w-full rounded-sm border border-(--line) bg-(--bg) px-3.25 pr-7
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

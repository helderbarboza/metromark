<script lang='ts'>
  import type { CommonTileProps } from '$lib/components/tile-props'
  import type { FolderTileView, PreviewCell } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import FaviconImage from '$lib/components/molecules/FaviconImage.svelte'
  import TileShell from '$lib/components/molecules/TileShell.svelte'
  import { tileVariants } from '$lib/components/tile-variants'
  import { FOLDER_COLUMNS, FOLDER_PREVIEW, FOLDER_ROWS } from '$lib/folder-preview'
  import { resolveTileColors } from '$lib/theme-colors'
  import { mode, theme } from 'mode-watcher'
  import { cn } from 'tailwind-variants'

  interface Props extends CommonTileProps {
    tile: FolderTileView
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    dataTestId = 'folder-tile',
    ...rest
  }: Props = $props()

  const ui = $derived(tileVariants({ size, selected, revealed }))

  const cols = $derived(FOLDER_COLUMNS[size])
  const iconRows = $derived(FOLDER_ROWS[size] - (size === 'small' ? 0 : 1))
  // Icon rows hug the square cell width; the title track absorbs all leftover height.
  const gridRows = $derived(size === 'small'
    ? `repeat(${iconRows}, auto)`
    : `repeat(${iconRows}, auto) minmax(0, 1fr)`)

  // Padded with blank slots so the mosaic keeps its shape on sparse folders.
  // Colors resolve from the theme, so theme/mode changes repaint the cells.
  interface BlankSlot { kind: 'blank' }
  interface FolderSlot { kind: 'folder', cell: PreviewCell }
  interface BookmarkSlot { kind: 'bookmark', cell: PreviewCell, bg: string, tint: string }
  type Slot = BlankSlot | FolderSlot | BookmarkSlot
  const cells = $derived.by((): Slot[] => {
    void mode.current
    void theme.current
    return Array.from({ length: FOLDER_PREVIEW[size] }, (_, index) => {
      const cell = tile.preview[index]
      if (!cell)
        return { kind: 'blank' } satisfies BlankSlot
      if (cell.kind === 'folder')
        return { kind: 'folder', cell } satisfies FolderSlot
      const colors = resolveTileColors({ colorIndex: cell.colorIndex ?? 0, color: cell.color })
      return {
        kind: 'bookmark',
        cell,
        bg: colors.bg,
        tint: colors.fg === 1 ? '#ffffff' : '#000000',
      } satisfies BookmarkSlot
    })
  })
</script>

<TileShell
  {...rest}
  {tile}
  {size}
  {selected}
  {revealed}
  dataTestId={dataTestId}
  defaultLabel={`Folder ${tile.title}`}
  resizeNoun={$LL.app.resizeNounFolderTile()}
>
  {#snippet content()}
    <div
      class='grid h-full content-center gap-px'
      style:grid-template-columns={`repeat(${cols}, minmax(0, 1fr))`}
      style:grid-template-rows={gridRows}
      aria-hidden='true'
    >
      {#each cells as cell, index (index)}
        {#if cell.kind === 'blank'}
          <div class='aspect-square min-h-0 bg-(--tile-bg)'></div>
        {:else if cell.kind === 'folder'}
          <div class='flex aspect-square min-h-0 items-center justify-center bg-(--tile-bg)'>
            <Icon name='folder' class='size-[55%]' />
          </div>
        {:else}
          <div
            class='@container flex aspect-square min-h-0 items-center justify-center'
            style:background={cell.bg}
            style:color={cell.tint}
          >
            <FaviconImage
              pageUrl={cell.cell.url ?? ''}
              tint={cell.tint}
              class='size-[55cqw]'
            />
          </div>
        {/if}
      {/each}
      {#if size !== 'small'}
        <div class={cn(ui.background(), `col-span-full flex min-h-0 w-full items-end justify-start text-left`)}>
          <div class={cn(ui.label(), 'min-w-0 flex-1')}>
            <span class={cn(ui.title(), 'block w-full min-w-0 truncate')}>{tile.title}</span>
          </div>
        </div>
      {/if}
    </div>
  {/snippet}
</TileShell>

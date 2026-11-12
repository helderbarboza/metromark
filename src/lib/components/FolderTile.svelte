<script lang='ts'>
  import type { FolderTileView, PreviewCell, TileSize } from '$lib/types'
  import FaviconIcon from '$lib/components/FaviconIcon.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { FOLDER_COLUMNS, FOLDER_PREVIEW, FOLDER_ROWS } from '$lib/folder-preview'
  import { TILE_SIZES } from '$lib/layout'
  import { resolveTileColors } from '$lib/theme-colors'
  import { mode, theme } from 'mode-watcher'
  import { cn } from 'tailwind-variants'
  import { tileVariants } from './tile-variants'
  import { tilt } from './tilt'
  import Button from './ui/button/button.svelte'

  interface Props {
    tile: FolderTileView
    size: TileSize
    selected?: boolean
    revealed?: boolean
    draggable?: boolean
    class?: string
    style?: string
    dataTestId?: string
    dataGridId?: string
    dataTileId?: string
    dataDragging?: boolean
    attach?: (node: HTMLElement) => void | (() => void)
    ariaLabel?: string
    ariaRoleDescription?: string
    tooltip?: string
    /** Quick grow/shrink tap target. Omit to hide the button. */
    onresize?: (size: TileSize) => void
    onclick?: (event: MouseEvent) => void
    onpointerdown?: (event: PointerEvent) => void
    onpointermove?: (event: PointerEvent) => void
    onpointerup?: (event: PointerEvent) => void
    onpointercancel?: (event: PointerEvent) => void
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    draggable = false,
    class: className,
    style,
    dataTestId = 'folder-tile',
    dataGridId,
    dataTileId,
    dataDragging,
    attach,
    ariaLabel,
    ariaRoleDescription,
    tooltip,
    onresize,
    onclick,
    onpointerdown,
    onpointermove,
    onpointerup,
    onpointercancel,
    ...rest
  }: Props = $props()

  const ui = $derived(tileVariants({ size, selected, revealed }))
  const checked = $derived(selected || revealed)
  const label = $derived(ariaLabel ?? `Folder ${tile.title}`)

  // Folder tiles default to a theme-accent color derived from the folder id;
  // users can pick any accent or custom hex, exactly like bookmark tiles.
  // Reactive so theme/mode changes repaint the tile.
  let colors = $derived(resolveTileColors(tile))
  $effect(() => {
    void mode.current
    void theme.current
    colors = resolveTileColors(tile)
  })
  const tileBackground = $derived(colors.bg)
  const tileForeground = $derived(colors.fg === 1 ? '#ffffff' : '#000000')

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

  const quickResize = $derived.by(():
    { target: TileSize, direction: 'grow' | 'shrink' } | null => {
    if (!onresize)
      return null
    if (size === 'large')
      return { target: 'small', direction: 'shrink' }
    const index = TILE_SIZES.indexOf(size)
    return { target: TILE_SIZES[index + 1], direction: 'grow' }
  })

</script>

<div
  class={cn('relative size-full', className)}
  data-dragging={dataDragging || undefined}
  style={style}
  {...rest}
>
  <button
    type='button'
    class={ui.root()}
    data-testid={dataTestId}
    data-size={size}
    data-selected={selected || undefined}
    data-grid-id={dataGridId}
    data-tile-id={dataTileId}
    title={tooltip ?? tile.title}
    aria-label={label}
    aria-roledescription={ariaRoleDescription}
    draggable={draggable}
    style:--tile-bg={tileBackground}
    style:--tile-fg={tileForeground}
  {@attach tilt}
  {@attach attach ?? (() => {})}
    onclick={onclick}
    onpointerdown={onpointerdown}
    onpointermove={onpointermove}
    onpointerup={onpointerup}
    onpointercancel={onpointercancel}
  >
    <div
      class='grid h-full content-center gap-px'
      style:grid-template-columns={`repeat(${cols}, minmax(0, 1fr))`}
      style:grid-template-rows={gridRows}
      aria-hidden='true'
    >
      {#each cells as cell, index (index)}
        {#if cell.kind === 'blank'}
          <div class={cn(ui.background(), `aspect-square min-h-0`)}></div>
        {:else if cell.kind === 'folder'}
          <div
            class={cn(ui.background(), `
              flex aspect-square min-h-0 items-center justify-center
            `)}
          >
            <Icon name='folder' class='size-[55%]' />
          </div>
        {:else}
          <div
            class='@container flex aspect-square min-h-0 items-center justify-center'
            style:background={cell.bg}
            style:color={cell.tint}
          >
            <FaviconIcon
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
    {#if checked}
      <span class={ui.check()} aria-hidden='true'>
        <Icon name='check' class='size-4' />
      </span>
    {/if}
  </button>
  {#if checked && quickResize}
    <Button
      variant='secondary'
      size='icon-xs'
      class='
        absolute right-0 bottom-0 z-2 translate-1.5 rounded-full border-border/60
        shadow-sm
      '
      aria-label={quickResize.direction === 'grow'
        ? `Grow ${tile.title} folder tile to ${quickResize.target}`
        : `Shrink ${tile.title} folder tile to ${quickResize.target}`}
      onpointerdown={event => event.stopPropagation()}
      onclick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const target = quickResize?.target
        if (target)
          onresize?.(target)
      }}
    >
      <Icon
        class='size-3.5'
        name={quickResize.direction === 'grow' ? 'arrowDownRight' : 'arrowUpLeft'}
      />
    </Button>
  {/if}
</div>

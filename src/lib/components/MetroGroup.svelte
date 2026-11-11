<script lang='ts'>
  import type { GroupView, Layout, TileSize, TileView } from '$lib/types'
  import type { Snippet } from 'svelte'
  import GridTile from '$lib/components/GridTile.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import MetroTile from '$lib/components/MetroTile.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Empty from '$lib/components/ui/empty'
  import { DRAG_PX } from '$lib/interaction'
  import {
    cellsToPx,
    EMPTY_GROUP_COLS,
    ENGINE_COL_HEADROOM,
    GAP,
    MAX_TILE_COLS,
    MIN_ENGINE_COLS,
    MIN_GROUP_COLS,
    ROWS,
    sizeOf,
    usedCols,
  } from '$lib/layout'
  import { focusFirstMenuItem } from '$lib/menu-focus'
  import { setTileGrid } from '$lib/tile-grid-context'
  import { safeUrl, validateUrl } from '$lib/url'
  import { cn } from '$lib/utils'
  import { getWorkspace, hasWorkspace } from '$lib/workspace-context'
  import {
    createGridContainer,
    createGridPlaceholder,
    horizontalCompactor,
  } from '@snapgridjs/svelte'

  interface Props {
    group: GroupView
    layout: Layout
    tiles: Record<string, TileView>
    cell: number
    draggable: boolean
    showDomains: boolean
    preview: boolean
    onLayoutChange: (id: string, layout: Layout) => void
    onDragStart: () => void
    onDragStop: () => void
    onSelect: (id: string, event: PointerEvent) => void
    /** Quick grow/shrink handler for the button on checked tiles. Omit to hide it. */
    onResizeTile?: (id: string, size: TileSize) => void
    /** Content of the per-group "Manage" dropdown menu. Omit to hide the button. */
    menu?: Snippet<[GroupView]>
    onAdd: (folderId: string) => void
    onBlocked: (message: string) => void
  }

  const {
    group,
    layout,
    tiles,
    cell,
    draggable,
    showDomains,
    preview,
    onLayoutChange,
    onDragStart,
    onDragStop,
    onSelect,
    onResizeTile,
    menu,
    onAdd,
    onBlocked,
  }: Props = $props()

  // Workspace state flows through context (set by the root component); stories
  // without a provider get inert defaults.
  const readWorkspace = hasWorkspace() ? getWorkspace() : undefined
  const dragging = $derived(readWorkspace?.().dragging ?? false)
  const selectedId = $derived(readWorkspace?.().selectedId ?? null)

  let liveCols = $state(0)
  let menuContentEl = $state<HTMLDivElement | null>(null)

  setTileGrid(() => ({ cell, gap: GAP }))

  const cols = $derived(Math.max(
    usedCols(layout),
    liveCols,
    group.layout.length ? MIN_GROUP_COLS : EMPTY_GROUP_COLS,
  ))

  const visibleWidth = $derived(cellsToPx(cols, cell))
  const engineCols = $derived(Math.max(
    usedCols(layout) + ENGINE_COL_HEADROOM,
    layout.length * MAX_TILE_COLS + ENGINE_COL_HEADROOM,
    MIN_ENGINE_COLS,
  ))
  const movable = $derived(draggable && group.writable)

  const container = createGridContainer(() => ({
    /*
    Must be stable and unique for this Start group.
    This is valid if `group.id` has those properties.
  */
    id: group.id,

    // Controlled state: the parent owns and persists this.
    layout,

    /*
    Critical: if containerPadding is [0, 0], canvas width must be:

    cols × cell + (cols - 1) × horizontal gap

    Otherwise SnapGrid will stretch/shrink each calculated column.
  */
    width: cellsToPx(engineCols, cell, GAP),

    gridConfig: {
      cols: engineCols,
      rowHeight: cell,
      margin: [GAP, GAP],
      containerPadding: [0, 0],

      /*
      Derived from the usable tile canvas height:
      floor((tileWellHeight + GAP) / (cell + GAP))

      Do not tie this directly to the device’s raw 768/1080 resolution.
    */
      maxRows: ROWS,
    },

    compactor: horizontalCompactor,

    autoSize: false,
    isResizable: false,
    isDraggable: movable,

    dragConfig: {
      enabled: movable,
      bounded: false,
      snapToGrid: false,

      /*
      This only delays when SnapGrid claims the gesture as a drag.
      Your separate cross-slide recognizer should own:
        0 → REVEAL_PX: selection-band/reveal feedback
        DRAG_PX+:     permit tile reordering
    */
      threshold: DRAG_PX,
    },

    onLayoutChange: (next) => {
      onLayoutChange(group.id, next)
    },

    onDragStart: () => {
      // Preserve enough canvas columns for the current drag.
      liveCols = usedCols(layout)
      onDragStart()
    },

    onDrag: (previewLayout) => {
      /*
      Grow only while dragging. Do not shrink during a drag,
      because that changes the canvas geometry under the pointer.
    */
      liveCols = Math.max(liveCols, usedCols(previewLayout))
    },

    onDragStop: () => {
      liveCols = 0
      onDragStop()
    },
  }))

  const placeholder = createGridPlaceholder(container.group)
  function href(tile: TileView) {
    return safeUrl(tile.url)
  }
  function launch(event: MouseEvent, tile: TileView) {
    if (dragging) {
      event.preventDefault()
      return
    }
    try {
      validateUrl(tile.url)
    }
    catch (error) {
      event.preventDefault()
      onBlocked(
        error instanceof Error
          ? error.message
          : 'Unable to open this bookmark.',
      )
    }
  }
</script>

<section
  data-testid='metro-group'
  class='flex-none transition-[width] duration-140 motion-reduce:transition-none'
  style:width='{visibleWidth}px'
  aria-label={group.path.join(' / ') || 'Ungrouped bookmarks'}
>
  <header class='flex h-15 items-end justify-between gap-2 pb-4.25'>
    <div class='min-w-0'>
      <div
        class='
          mb-1.5 truncate text-xs tracking-[1.1px] text-(--muted-foreground) uppercase
        '
        data-testid='group-path'
      >
        {group.path.length > 1
          ? `${group.path.slice(0, -1).join(' / ')} /`
          : 'BROWSER ROOT'}
      </div>
      <div class='flex items-center gap-2.75'>
        <h2 class='m-0 truncate text-[16px] leading-[1.1] font-semibold text-(--foreground)'>
          {group.title}
        </h2>
        <span class='text-xs text-(--muted-foreground) tabular-nums'>
          {String(layout.length).padStart(2, '0')}
        </span>
        {#if !group.writable}
          <Icon name='lock' size={12} />
        {/if}
      </div>
    </div>
    {#if menu}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label="Manage {group.title || 'unnamed group'}"
          class='
            inline-flex size-9.5 shrink-0 items-center justify-center rounded-[3px] border
            border-transparent bg-transparent text-(--muted-foreground) opacity-[.85]
            hover:bg-(--accent) hover:text-(--foreground)
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-(--primary)
          '
        >
          <Icon name='more' size={17} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          bind:ref={menuContentEl}
          aria-label={`Actions for ${group.title || 'unnamed group'}`}
          class='w-65'
          onOpenAutoFocus={event => focusFirstMenuItem(event, menuContentEl)}
        >
          <DropdownMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
            <strong class='truncate text-[12px] font-semibold'>{group.title || 'Unnamed group'}</strong>
          </DropdownMenu.Label>
          {@render menu(group)}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </header>
  <div
{@attach container.attach}
    style='{container.style} width: {visibleWidth}px; height: {cellsToPx(ROWS, cell)}px;'
    class={cn(
      'relative',
      container.isDropTarget && 'outline outline-offset-[6px] outline-(--primary)',
    )}
    data-testid='metro-grid'
    role='group'
    aria-label="Tiles in {group.path.join(' / ')}"
    data-group-id={group.id}
  >
    {#each layout as entry (entry.i)}
      {@const tile = tiles[entry.i]}
      {#if tile}
        {#if movable && tile.writable}
          <GridTile
            id={entry.i}
            group={container.group}
            {tile}
            {showDomains}
            {preview}
            onselect={onSelect}
            onblocked={onBlocked}
            onresize={onResizeTile && (size => onResizeTile(entry.i, size))}
          />
        {:else}
          <MetroTile
            {tile}
            size={sizeOf(entry)}
            selected={selectedId === entry.i}
            domain={tile.domain}
            showDomain={showDomains}
            href={href(tile)}
            target={preview ? '_blank' : undefined}
            ariaLabel="Open {tile.title}{showDomains
              && sizeOf(entry) !== 'small'
              ? ` ${tile.domain}`
              : ''}"
            onclick={event => launch(event, tile)}
            class='
              block transition-[left,top,width,height] duration-140
              motion-reduce:transition-none
            '
            style={`
              position: absolute;
              left: ${entry.x * (cell + GAP)}px;
              top: ${entry.y * (cell + GAP)}px;
              width: ${cellsToPx(entry.w, cell)}px;
              height: ${cellsToPx(entry.h, cell)}px;
            `}
            dataTestId='tile-slot'
            dataTileId={entry.i}
            onresize={tile.writable && onResizeTile
              ? size => onResizeTile(entry.i, size)
              : undefined}
          />
        {/if}
      {/if}
    {/each}
    {#if placeholder.current}
      <div
        data-testid='grid-placeholder'
        class='
          pointer-events-none absolute z-0
          bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] outline
          outline-(--primary) outline-dashed
        '
        aria-hidden='true'
        style={placeholder.current.style}
      >
      </div>
    {/if}
    {#if !layout.length}
      <Empty.Root class='h-full'>
        <Empty.Header>
          <Empty.Media variant='icon'>
            <Icon name='folder' size={22} />
          </Empty.Media>
          <Empty.Title>This folder is empty</Empty.Title>
          <Empty.Description>
            Add a bookmark or move tiles here from any other group.
          </Empty.Description>
        </Empty.Header>
        {#if group.writable}
          <Empty.Content>
            <Button variant='outline' size='sm' onclick={() => onAdd(group.id)}>
              <Icon name='addBookmark' />Add a bookmark
            </Button>
          </Empty.Content>
        {/if}
      </Empty.Root>
    {/if}
  </div>
</section>

<script lang='ts'>
  import type { GroupView, Layout, TileSize, TileView } from '$lib/types'
  import type { Snippet } from 'svelte'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import BookmarkTile from '$lib/components/organisms/BookmarkTile.svelte'
  import FolderTile from '$lib/components/organisms/FolderTile.svelte'
  import GridTile from '$lib/components/organisms/GridTile.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import * as Empty from '$lib/components/ui/empty'
  import { DRAG_PX } from '$lib/interaction'
  import { inspectLaunchUrl } from '$lib/launch-url'
  import {
    cellsToPx,
    EMPTY_GROUP_COLS,
    ENGINE_COL_HEADROOM,
    GAP,
    layoutItemStyle,
    MAX_TILE_COLS,
    MIN_ENGINE_COLS,
    MIN_GROUP_COLS,
    ROWS,
    sizeOf,
    usedCols,
  } from '$lib/layout'
  import { focusFirstMenuItem } from '$lib/menu-focus'
  import { setTileGrid } from '$lib/tile-grid-context'
  import { cn } from '$lib/utils.js'
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
    /** Grid row count: 8 in Classic, 2 in Dock. */
    rows?: number
    draggable: boolean
    showDomains: boolean
    preview: boolean
    onLayoutChange: (id: string, layout: Layout) => void
    onDragStart: () => void
    onDragStop: () => void
    onSelect: (id: string, event: PointerEvent) => void
    /** Called when a bookmark address is unsafe to open. The URL stays in the tree. */
    onblocked?: (url: string) => void
    /** Quick grow/shrink handler for the button on checked tiles. Omit to hide it. */
    onResizeTile?: (id: string, size: TileSize) => void
    /** Folder tiles activate by scrolling to their group instead of launching. */
    onActivateFolder?: (id: string) => void
    /** Brief highlight of this group after a folder tile scrolled it into view. */
    flash?: boolean
    /** Content of the per-group context menu, rendered in the header's trigger. */
    menu?: Snippet<[GroupView]>
    onAdd: (folderId: string) => void
  }

  const {
    group,
    layout,
    tiles,
    cell,
    rows = ROWS,
    draggable,
    showDomains,
    preview,
    onLayoutChange,
    onDragStart,
    onDragStop,
    onSelect,
    onblocked,
    onResizeTile,
    onActivateFolder,
    flash = false,
    menu,
    onAdd,
  }: Props = $props()

  // Workspace state flows through context (set by the root component); stories
  // without a provider get inert defaults.
  const readWorkspace = hasWorkspace()
    ? getWorkspace()
    : undefined
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

  // Split entries: snapgrid-managed tiles (positioned by the engine) and
  // static tiles (positioned by the flip wrapper below).
  const draggableEntries = $derived(layout.flatMap((entry) => {
    const tile = tiles[entry.i]
    return movable && tile?.writable
      ? [
        { entry, tile },
      ]
      : []
  }))

  const staticEntries = $derived(layout.flatMap((entry) => {
    const tile = tiles[entry.i]
    return tile && !(movable && tile.writable)
      ? [
        { entry, tile },
      ]
      : []
  }))

  /*
   * The container droppable must have a distinct id from the tiles inside it:
   * dnd-kit's registry holds one entity per id, and a folder's metro-grid and
   * its folder tile (sortable, id = bookmark id) would otherwise share the
   * slot. Prefixing the grid id keeps both registered, so newly mounted
   * groups accept drops (previously they silently lost the slot and could
   * not receive drops until a reload).
   */
  const container = createGridContainer(() => ({
    id: `grid:${group.id}`,

    // Controlled state: the parent owns and persists this.
    layout,

    /*
    Critical: if containerPadding is [0, 0], board width must be:

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
      Derived from the usable tile board height:
      floor((tileWellHeight + GAP) / (cell + GAP))

      Do not tie this directly to the device’s raw 768/1080 resolution.
    */
      maxRows: rows,
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
      // Touch must arm on the same distance as mouse and pen. The default
      // hold also sets touch-action: pan-y, which gives quick vertical
      // swipes to the browser instead of the cross-slide recognizer.
      touchHold: 0,
    },

    onLayoutChange: (next) => {
      onLayoutChange(group.id, next)
    },

    onDragStart: () => {
      // Preserve enough board columns for the current drag.
      liveCols = usedCols(layout)
      onDragStart()
    },

    onDrag: (previewLayout) => {
      /*
      Grow only while dragging. Do not shrink during a drag,
      because that changes the board geometry under the pointer.
    */
      liveCols = Math.max(liveCols, usedCols(previewLayout))
    },

    onDragStop: () => {
      liveCols = 0
      onDragStop()
    },
  }))

  const placeholder = createGridPlaceholder(container.group)
  function launch(event: MouseEvent) {
    if (dragging)
      event.preventDefault()
  }
  /**
   * Keyboard activation for the header trigger: dispatches a contextmenu at the
   * trigger's position. Deferred to a microtask so it does not run nested inside
   * the current keydown's event-delegation walk, whose handler ordering differs.
   */
  function openGroupMenu(event: KeyboardEvent) {
    const target = event.currentTarget
    if (!(target instanceof HTMLElement))
      return
    const rect = target.getBoundingClientRect()
    queueMicrotask(() => {
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: rect.left + 24,
        clientY: rect.bottom,
      }))
    })
  }

</script>

<section
  data-testid='metro-group'
  data-group-id={group.id}
  class={cn('flex-none transition-[width] duration-150 motion-reduce:transition-none', flash && 'animate-flash')}
  style:width='{visibleWidth}px'
  aria-label={group.path.join(' / ') || $LL.app.ungroupedBookmarks()}
>
  {#snippet headerBody()}
    <div class='min-w-0 text-foreground drop-shadow-sm'>
      <div
        class='mb-1.5 truncate text-xs tracking-widest uppercase'
        data-testid='group-path'
        title={group.path.join(' / ')}
      >
        {group.path.length > 1
          ? `${group.path.slice(0, -1).join(' / ')} /`
          : $LL.app.browserRoot()}
      </div>
      <div class='flex items-start gap-2.75'>
        <h2
          class='m-0 line-clamp-2 text-base/tight font-semibold wrap-break-word'
          title={group.title}
        >
          {group.title}
        </h2>
        {#if !group.writable}
          <Icon name='lock' size={12} class='mt-1 shrink-0' />
        {/if}
      </div>
    </div>
  {/snippet}

  {#if menu}
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {#snippet child({ props })}
          <div
            {...props}
            class='
              flex cursor-default items-end gap-2 pb-4.25 outline-none
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-(--primary)
            '
            tabindex='0'
            role='button'
            aria-haspopup='menu'
            data-testid='group-header'
            onkeydown={(event) => {
              if (
                event.key === 'Enter'
                || event.key === ' '
                || event.key === 'ArrowDown'
                || (event.key === 'F10' && event.shiftKey)
                || event.key === 'ContextMenu'
              ) {
                event.preventDefault()
                openGroupMenu(event)
              }
            }}
          >
            {@render headerBody()}
          </div>
        {/snippet}
      </ContextMenu.Trigger>
      <ContextMenu.Content
        bind:ref={menuContentEl}
        aria-label={$LL.app.actionsFor({ title: group.title || $LL.app.unnamedGroup() })}
        class='w-65'
        onOpenAutoFocus={event => focusFirstMenuItem(event, menuContentEl)}
      >
        <ContextMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
          <strong class='truncate text-xs font-semibold'>{group.title || $LL.app.unnamedGroup()}</strong>
          <span class='truncate text-xs text-(--muted-foreground)'>{group.path.join(' / ')}</span>
        </ContextMenu.Label>
        {@render menu(group)}
      </ContextMenu.Content>
    </ContextMenu.Root>
  {:else}
    <div class='flex items-end gap-2 pb-4.25'>
      {@render headerBody()}
    </div>
  {/if}
  <div
{@attach container.attach}
    style='{container.style} width: {visibleWidth}px; height: {cellsToPx(rows, cell)}px;'
    class={cn(
      'relative',
      container.isDropTarget && 'outline outline-offset-[6px] outline-(--primary)',
    )}
    data-testid='metro-grid'
    role='group'
    aria-label={$LL.app.tilesIn({
      path: group.path.join(' / '),
    })}
    data-group-id={group.id}
  >
    {#each draggableEntries as { entry, tile } (entry.i)}
      <GridTile
        id={entry.i}
        group={container.group}
        {entry}
        {cell}
        {tile}
        {showDomains}
        {preview}
        onselect={onSelect}
        {onblocked}
        onactivate={onActivateFolder}
        onresize={onResizeTile && (size => onResizeTile(entry.i, size))}
      />
    {/each}
    {#each staticEntries as { entry, tile } (entry.i)}
      {@const folderTile = tile.kind === 'folder'
        ? tile
        : undefined}
      {@const bookmarkTile = tile.kind === 'bookmark'
        ? tile
        : undefined}
      <div
        class='absolute'
        style={layoutItemStyle(entry, cell)}
      >
        {#if folderTile}
          <FolderTile
            tile={folderTile}
            size={sizeOf(entry)}
            selected={selectedId === entry.i}
            ariaLabel={$LL.app.folderTileSummary({ title: folderTile.title })}
            onclick={() => onActivateFolder?.(entry.i)}
            class='block size-full'
            dataTestId='folder-tile'
            dataTileId={entry.i}
            onresize={folderTile.writable && onResizeTile
              ? size => onResizeTile(entry.i, size)
              : undefined}
          />
        {:else if bookmarkTile}
          {@const target = inspectLaunchUrl(bookmarkTile.url)}
          <BookmarkTile
            tile={bookmarkTile}
            size={sizeOf(entry)}
            selected={selectedId === entry.i}
            domain={bookmarkTile.domain}
            showDomain={showDomains}
            as={target.ok ? 'a' : 'button'}
            href={target.ok ? target.url : undefined}
            target={preview ? '_blank' : undefined}
            ariaLabel={$LL.app.openBookmarkName({
              name: showDomains && sizeOf(entry) !== 'small'
                ? `${bookmarkTile.title} ${bookmarkTile.domain}`
                : bookmarkTile.title,
            })}
            onclick={(event) => {
              launch(event)
              if (!target.ok) {
                event.preventDefault()
                onblocked?.(bookmarkTile.url)
              }
            }}
            class='block size-full'
            dataTestId='tile-slot'
            dataTileId={entry.i}
            onresize={bookmarkTile.writable && onResizeTile
              ? size => onResizeTile(entry.i, size)
              : undefined}
          />
        {/if}
      </div>
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
          <Empty.Title>{$LL.app.emptyFolderTitle()}</Empty.Title>
          <Empty.Description>
            {$LL.app.emptyFolderDescription()}
          </Empty.Description>
        </Empty.Header>
        {#if group.writable}
          <Empty.Content>
            <Button variant='outline' size='sm' onclick={() => onAdd(group.id)}>
              <Icon name='addBookmark' />{$LL.app.addBookmark()}
            </Button>
          </Empty.Content>
        {/if}
      </Empty.Root>
    {/if}
  </div>
</section>

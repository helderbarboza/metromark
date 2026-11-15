<script lang='ts'>
  import type { GroupView, Layout, TileSize, TileView } from '$lib/types'
  import type { Snippet } from 'svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import BookmarkTile from '$lib/components/organisms/BookmarkTile.svelte'
  import FolderTile from '$lib/components/organisms/FolderTile.svelte'
  import GridTile from '$lib/components/organisms/GridTile.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as ContextMenu from '$lib/components/ui/context-menu'
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
    /** Folder tiles activate by scrolling to their group instead of launching. */
    onActivateFolder?: (id: string) => void
    /** Brief highlight of this group after a folder tile scrolled it into view. */
    flash?: boolean
    /** Content of the per-group context menu, rendered in the header's trigger. */
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
    onActivateFolder,
    flash = false,
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
  function href(tile: Extract<TileView, { kind: 'bookmark' }>) {
    return safeUrl(tile.url)
  }
  function launch(event: MouseEvent, tile: Extract<TileView, { kind: 'bookmark' }>) {
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
  class={cn('flex-none transition-[width] duration-140 motion-reduce:transition-none', flash && 'animate-flash')}
  style:width='{visibleWidth}px'
  aria-label={group.path.join(' / ') || 'Ungrouped bookmarks'}
>
  {#snippet headerBody()}
    <div class='min-w-0'>
      <div
        class='
          mb-1.5 truncate text-xs tracking-widest text-(--muted-foreground) uppercase
        '
        data-testid='group-path'
        title={group.path.join(' / ')}
      >
        {group.path.length > 1
          ? `${group.path.slice(0, -1).join(' / ')} /`
          : 'BROWSER ROOT'}
      </div>
      <div class='flex items-start gap-2.75'>
        <h2
          class='
            m-0 line-clamp-2 text-base/tight font-semibold wrap-break-word text-foreground
          '
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
        aria-label={`Actions for ${group.title || 'unnamed group'}`}
        class='w-65'
        onOpenAutoFocus={event => focusFirstMenuItem(event, menuContentEl)}
      >
        <ContextMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
          <strong class='truncate text-xs font-semibold'>{group.title || 'Unnamed group'}</strong>
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
      {@const folderTile = tile?.kind === 'folder' ? tile : undefined}
      {@const bookmarkTile = tile?.kind === 'bookmark' ? tile : undefined}
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
            onactivate={onActivateFolder}
            onresize={onResizeTile && (size => onResizeTile(entry.i, size))}
          />
        {:else if folderTile}
          <FolderTile
            tile={folderTile}
            size={sizeOf(entry)}
            selected={selectedId === entry.i}
            ariaLabel="Folder {folderTile.title}. Activating scrolls to this folder's group."
            onclick={() => onActivateFolder?.(entry.i)}
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
            dataTestId='folder-tile'
            dataTileId={entry.i}
            onresize={folderTile.writable && onResizeTile
              ? size => onResizeTile(entry.i, size)
              : undefined}
          />
        {:else if bookmarkTile}
          <BookmarkTile
            tile={bookmarkTile}
            size={sizeOf(entry)}
            selected={selectedId === entry.i}
            domain={bookmarkTile.domain}
            showDomain={showDomains}
            href={href(bookmarkTile)}
            target={preview ? '_blank' : undefined}
            ariaLabel="Open {bookmarkTile.title}{showDomains
              && sizeOf(entry) !== 'small'
              ? ` ${bookmarkTile.domain}`
              : ''}"
            onclick={event => launch(event, bookmarkTile)}
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
            onresize={bookmarkTile.writable && onResizeTile
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

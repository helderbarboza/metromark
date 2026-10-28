<script lang='ts'>
  import type { GroupView, Layout, TileView } from '$lib/types'
  import GridTile from '$lib/components/GridTile.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import IconButton from '$lib/components/IconButton.svelte'
  import MetroTile from '$lib/components/MetroTile.svelte'
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
  import { safeUrl, validateUrl } from '$lib/url'
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
    dragging: boolean
    selectedId: string | null
    showDomains: boolean
    preview: boolean
    onLayoutChange: (id: string, layout: Layout) => void
    onDragStart: () => void
    onDragStop: () => void
    onSelect: (id: string, event: PointerEvent) => void
    onContext: (
      event: MouseEvent,
      target: 'tile' | 'group' | 'canvas',
      id: string,
    ) => void
    onAdd: (folderId: string) => void
    onBlocked: (message: string) => void
  }

  const {
    group,
    layout,
    tiles,
    cell,
    draggable,
    dragging,
    selectedId,
    showDomains,
    preview,
    onLayoutChange,
    onDragStart,
    onDragStop,
    onSelect,
    onContext,
    onAdd,
    onBlocked,
  }: Props = $props()

  let liveCols = $state(0)

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
  class='metro-group'
  data-testid='metro-group'
  style:width='{visibleWidth}px'
  aria-label={group.path.join(' / ') || 'Ungrouped bookmarks'}
>
  <header class='group-header'>
    <div class='group-heading'>
      <div class='group-path' data-testid='group-path'>
        {group.path.length > 1
          ? `${group.path.slice(0, -1).join(' / ')} /`
          : 'BROWSER ROOT'}
      </div>
      <div class='group-name-line'>
        <h2>{group.title}</h2>
        <span class='group-count'>{String(layout.length).padStart(2, '0')}</span>
        {#if !group.writable}
          <Icon name='lock' size={12} />
        {/if}
      </div>
    </div>
    <IconButton
      label="Manage {group.title || 'unnamed group'}"
      class='group-menu'
      onclick={event => onContext(event, 'group', group.id)}
    >
      <Icon name='more' size={17} />
    </IconButton>
  </header>
  <!-- Right-click only; standard keyboard management is provided by the labeled heading button. -->
  <div
{@attach container.attach}
    style='{container.style} width: {visibleWidth}px; height: {cellsToPx(ROWS, cell)}px;'
    class='metro-grid'
    data-testid='metro-grid'
    role='group'
    aria-label="Tiles in {group.path.join(' / ')}"
    class:drop-target={container.isDropTarget}
    oncontextmenu={event => onContext(event, 'canvas', group.id)}
  >
    {#each layout as entry (entry.i)}
      {@const tile = tiles[entry.i]}
      {#if tile}
        {#if movable && tile.writable}
          <GridTile
            id={entry.i}
            group={container.group}
            {tile}
            selected={selectedId === entry.i}
            {showDomains}
            {preview}
            {dragging}
            onselect={onSelect}
            oncontextmenu={event => onContext(event, 'tile', entry.i)}
            onblocked={onBlocked}
          />
        {:else}
          <a
            class='tile-slot'
            data-testid='tile-slot'
            href={href(tile)}
            target={preview ? '_blank' : undefined}
            rel='noopener noreferrer'
            title='{tile.title} — {tile.url}'
            style:left='{entry.x * (cell + GAP)}px'
            style:top='{entry.y * (cell + GAP)}px'
            style:width='{cellsToPx(entry.w, cell)}px'
            style:height='{cellsToPx(entry.h, cell)}px'
            aria-label="Open {tile.title}{showDomains
              && sizeOf(entry) !== 'small'
              ? ` ${tile.domain}`
              : ''}"
            onclick={event => launch(event, tile)}
            oncontextmenu={event => onContext(event, 'tile', entry.i)}
          >
            <MetroTile
              {tile}
              size={sizeOf(entry)}
              selected={selectedId === entry.i}
              domain={tile.domain}
              showDomain={showDomains}
            />
          </a>
        {/if}
      {/if}
    {/each}
    {#if placeholder.current}
      <div
        class='grid-placeholder'
        data-testid='grid-placeholder'
        aria-hidden='true'
        style={placeholder.current.style}
      >
      </div>
    {/if}
    {#if !layout.length}
      <div class='empty-group'>
        <Icon name='folder' size={30} />
        <h3>Nothing here. Yet.</h3>
        <p>A little room for your next favorite.</p>
        {#if group.writable}
          <button
            class='empty-add'
            onclick={() => onAdd(group.id)}
          >
            <Icon name='addBookmark' size={15} />Add a bookmark
          </button>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .metro-group {
    flex: none;
    --transition-duration: 140ms;
    transition: width var(--transition-duration) ease;
  }
  .group-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 60px;
    padding-bottom: 17px;
    gap: 8px;
  }
  .group-heading {
    min-width: 0;
  }
  .group-path {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1.1px;
    text-transform: uppercase;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .group-name-line {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .group-count {
    color: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .metro-group :global(.group-menu) {
    width: 38px;
    height: 38px;
    border-radius: 3px;
    opacity: 0.85;
    flex-shrink: 0;
  }
  .metro-group:hover :global(.group-menu),
  :global(.group-menu):focus-visible {
    opacity: 1;
  }
  .metro-grid {
    position: relative;
  }
  .metro-grid.drop-target {
    outline: 1px solid var(--accent);
    outline-offset: 6px;
  }
  .tile-slot {
    position: absolute;
    display: block;
    text-decoration: none;
    color: inherit;
    transition:
      left var(--transition-duration),
      top var(--transition-duration),
      width var(--transition-duration),
      height var(--transition-duration);
  }
  .tile-slot:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 3px;
    z-index: 2;
  }
  .grid-placeholder {
    position: absolute;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    outline: 1px dashed var(--accent);
    z-index: 0;
    pointer-events: none;
  }
  .empty-group {
    border: 1px dashed var(--line);
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--muted);
  }
  .empty-group h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin: 16px 0 9px;
  }
  .empty-group p {
    font-size: 12px;
    margin: 0;
  }
  .empty-add {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 12px;
    margin-top: 26px;
    background: var(--surface);
    border: 1px solid var(--line);
    font-size: 11px;
    color: var(--text);
    border-radius: 3px;
  }
  .empty-add:hover {
    background: var(--surface-hover);
  }
  @media (prefers-reduced-motion: reduce) {
    .metro-group,
    .tile-slot {
      transition: none;
    }
  }
</style>

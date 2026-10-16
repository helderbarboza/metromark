<script lang="ts">
  import { createGridContainer, createGridPlaceholder, horizontalCompactor } from '@snapgridjs/svelte';
  import type { Density, GroupView, Layout, TileView } from '../types';
  import { cellsToPx, GAP, ROWS, usedCols, sizeOf } from '../layout';
  import { validateUrl } from '../tree';
  import MetroTile from './MetroTile.svelte';
  import GridTile from './GridTile.svelte';
  import Icon from './Icon.svelte';
  let { group, layout, tiles, cell, gap = GAP, density = 'default', arranging, dragging, selectedId, showDomains, preview,
    onLayoutChange, onDragStart, onDragStop, onSelect, onContext, onAdd, onBlocked }: {
    group: GroupView; layout: Layout; tiles: Record<string, TileView>; cell: number; gap?: number; density?: Density; arranging: boolean; dragging: boolean;
    selectedId: string | null; showDomains: boolean; preview: boolean;
    onLayoutChange: (id: string, layout: Layout) => void;
    onDragStart: () => void; onDragStop: () => void; onSelect: (id: string) => void;
    onContext: (event: MouseEvent, target: 'tile' | 'group' | 'canvas', id: string) => void;
    onAdd: (folderId: string) => void; onBlocked: (message: string) => void;
  } = $props();
  let liveCols = $state(0);
  const cols = $derived(Math.max(usedCols(layout), liveCols, group.layout.length ? 2 : 4));
  const visibleWidth = $derived(cellsToPx(cols, cell, gap));
  const engineCols = $derived(Math.max(usedCols(layout) + 12, layout.length * 4 + 12, 24));
  const container = createGridContainer(() => ({
    id: group.id, layout, width: cellsToPx(engineCols, cell, gap),
    gridConfig: { cols: engineCols, rowHeight: cell, margin: [gap, gap], containerPadding: [0, 0], maxRows: ROWS },
    compactor: horizontalCompactor, isResizable: false, autoSize: false,
    isDraggable: arranging && group.writable,
    dragConfig: { threshold: 6 },
    onLayoutChange: (next) => onLayoutChange(group.id, next),
    onDragStart,
    onDrag: (next) => { liveCols = usedCols(next); },
    onDragStop: () => { liveCols = 0; onDragStop(); },
  }));
  const placeholder = createGridPlaceholder(container.group);
  function href(tile: TileView) { try { return validateUrl(tile.url); } catch { return '#'; } }
  function launch(event: MouseEvent, tile: TileView) {
    if (dragging) { event.preventDefault(); return; }
    try { validateUrl(tile.url); } catch (error) { event.preventDefault(); onBlocked(error instanceof Error ? error.message : 'Unable to open this bookmark.'); }
  }
</script>
<section class="metro-group" style:width="{visibleWidth}px" aria-label={group.path.join(' / ') || 'Ungrouped bookmarks'}>
  <header class="group-header">
    <div class="group-heading">
      <div class="group-path">{group.path.length > 1 ? `${group.path.slice(0, -1).join(' / ')} /` : 'BROWSER ROOT'}</div>
      <div class="group-name-line"><h2>{group.title}</h2><span class="group-count">{String(layout.length).padStart(2, '0')}</span>{#if !group.writable}<Icon name="lock" size={12} />{/if}</div>
    </div>
    <button class="icon-button group-menu" aria-label="Manage {group.title || 'unnamed group'}" onclick={(event) => onContext(event, 'group', group.id)}><Icon name="more" size={17} /></button>
  </header>
  <!-- Right-click only; standard keyboard management is provided by the labeled heading button. -->
  <div {@attach container.attach} style="{container.style} width: {visibleWidth}px; height: {cellsToPx(ROWS, cell, gap)}px;" class="metro-grid" role="group" aria-label="Tiles in {group.path.join(' / ')}" class:drop-target={container.isDropTarget}
    oncontextmenu={(event) => onContext(event, 'canvas', group.id)}>
    {#each layout as entry (entry.i)}
      {@const tile = tiles[entry.i]}
      {#if tile}
        {#if arranging && group.writable && tile.writable}
          <GridTile id={entry.i} group={container.group} {tile} selected={selectedId === entry.i} {showDomains} {density}
            onclick={() => { if (!dragging) onSelect(entry.i); }} oncontextmenu={(event) => onContext(event, 'tile', entry.i)} />
        {:else}
          <a class="tile-slot" href={href(tile)} target={preview ? '_blank' : undefined} rel="noopener noreferrer" title="{tile.title} — {tile.url}"
            style:left="{entry.x * (cell + gap)}px" style:top="{entry.y * (cell + gap)}px"
            style:width="{cellsToPx(entry.w, cell, gap)}px" style:height="{cellsToPx(entry.h, cell, gap)}px"
            aria-label="Open {tile.title}{showDomains && sizeOf(entry) !== 'small' ? ' ' + tile.domain : ''}" onclick={(event) => launch(event, tile)} oncontextmenu={(event) => onContext(event, 'tile', entry.i)}>
            <MetroTile {tile} size={sizeOf(entry)} selected={selectedId === entry.i} domain={tile.domain} showDomain={showDomains} {density} />
          </a>
        {/if}
      {/if}
    {/each}
    {#if placeholder.current}<div class="grid-placeholder" aria-hidden="true" style={placeholder.current.style}></div>{/if}
    {#if !layout.length}<div class="empty-group"><Icon name="folder" size={30} /><h3>Nothing here. Yet.</h3><p>A little room for your next favorite.</p>{#if group.writable}<button class="empty-add" onclick={() => onAdd(group.id)}><Icon name="plus" size={15} />Add a bookmark</button>{/if}</div>{/if}
  </div>
</section>
<style>
  .metro-group { flex: none; transition: width 140ms ease; }
  .group-header { display: flex; align-items: flex-end; justify-content: space-between; height: 60px; padding-bottom: 17px; gap: 8px; }
  .group-heading { min-width: 0; }
  .group-path { font-size: 8px; color: var(--muted); letter-spacing: 1.1px; text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-bottom: 6px; }
  .group-name-line { display: flex; align-items: center; gap: 11px; }
  h2 { font-size: 16px; font-weight: 450; line-height: 1.1; letter-spacing: -.35px; color: var(--text); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .group-count { color: var(--muted); font-size: 9px; font-variant-numeric: tabular-nums; }
  .group-menu { width: 24px; height: 25px; border-radius: 3px; opacity: .5; flex-shrink: 0; }
  .metro-group:hover .group-menu, .group-menu:focus-visible { opacity: 1; }
  .metro-grid { position: relative; transition: outline 150ms; }
  .metro-grid.drop-target { outline: 1px solid var(--accent); outline-offset: 6px; }
  .tile-slot { position: absolute; display: block; text-decoration: none; color: white; transition: left 140ms, top 140ms, width 140ms, height 140ms; }
  .tile-slot:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; z-index: 2; }
  .grid-placeholder { position: absolute; background: #c4b6f428; outline: 1px dashed var(--accent); z-index: 0; pointer-events: none; }
  .empty-group { border: 1px dashed var(--line); height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); }
  .empty-group h3 { font-size: 16px; font-weight: 450; color: var(--text); margin: 16px 0 9px; }
  .empty-group p { font-size: 10px; margin: 0; }
  .empty-add { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; margin-top: 26px; background: var(--surface); border: 1px solid var(--line); font-size: 11px; color: var(--text); border-radius: 3px; }
  .empty-add:hover { background: var(--surface-hover); }
</style>

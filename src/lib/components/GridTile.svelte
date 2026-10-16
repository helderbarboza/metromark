<script lang="ts">
  import { createGridItem } from '@snapgridjs/svelte';
  import type { Density, TileView } from '../types';
  import { sizeOf } from '../layout';
  import MetroTile from './MetroTile.svelte';
  let { id, group, tile, selected, showDomains, density = 'default', onclick, oncontextmenu }: {
    id: string; group: string; tile: TileView; selected: boolean; showDomains: boolean; density?: Density;
    onclick: (event: MouseEvent) => void; oncontextmenu: (event: MouseEvent) => void;
  } = $props();
  // Snapgrid instances are keyed by immutable browser bookmark IDs.
  // svelte-ignore state_referenced_locally
  const item = createGridItem({ id, group });
</script>
<button
  type="button" {@attach item.attach} style={item.style} class="grid-tile snapgrid-item"
  data-grid-id={id} data-dragging={item.isDragging || undefined}
  aria-label="Arrange {tile.title}{showDomains && tile.size !== 'small' ? ' ' + tile.domain : ''}. Enter or Space to pick up; arrow keys to move; Escape to cancel."
  aria-roledescription="draggable bookmark" {onclick} {oncontextmenu}
>
  <MetroTile {tile} size={item.item ? sizeOf(item.item) : tile.size} {selected} domain={tile.domain} showDomain={showDomains} {density} arranging />
</button>
<style>
  .grid-tile { border: 0; padding: 0; background: transparent; text-align: left; color: inherit; cursor: grab; }
  .grid-tile[data-dragging] { cursor: grabbing; z-index: 10; box-shadow: 0 20px 45px #0005; }
  .grid-tile:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; z-index: 2; }
</style>

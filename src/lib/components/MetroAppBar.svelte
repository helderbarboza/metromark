<script lang="ts">
  import type { TileSize } from '../types';
  import Icon from './Icon.svelte';
  let { title, size, writable, onresize, onedit, ondelete, onclear }: {
    title: string; size: TileSize; writable: boolean; onresize: (size: TileSize) => void;
    onedit: () => void; ondelete: () => void; onclear: () => void;
  } = $props();
</script>
<div class="app-bar" aria-label="Selected bookmark actions">
  <span class="selected-label"><span class="selection-dot"></span>{title}</span>
  <div class="size-options">{#each ['small', 'medium', 'wide', 'large'] as preset (preset)}<button class:active={size === preset} aria-label="Resize selected tile to {preset}" onclick={() => onresize(preset as TileSize)}>{preset}</button>{/each}</div>
  <div class="bar-actions"><button disabled={!writable} aria-label="Edit selected bookmark" onclick={onedit}><Icon name="edit" size={15} /></button><button class="delete" disabled={!writable} aria-label="Delete selected bookmark" onclick={ondelete}><Icon name="trash" size={15} /></button><button aria-label="Clear selection" onclick={onclear}><Icon name="close" size={16} /></button></div>
</div>
<style>
  .app-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 24px; border: 1px solid var(--line); background: var(--surface); padding: 9px 12px 9px 17px; border-radius: 6px; z-index: 50; box-shadow: var(--shadow); max-width: calc(100vw - 24px); }
  .selected-label { display: flex; align-items: center; gap: 9px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
  .selection-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
  .size-options { display: flex; gap: 3px; }
  .size-options button { padding: 8px 11px; border-radius: 3px; font-size: 10px; text-transform: capitalize; background: transparent; color: var(--muted); }
  .size-options button:hover, .size-options button.active { background: var(--surface-hover); color: var(--text); }
  .bar-actions { display: flex; gap: 3px; border-left: 1px solid var(--line); padding-left: 12px; }
  .bar-actions button { width: 29px; height: 29px; display: flex; align-items: center; justify-content: center; background: transparent; color: var(--muted); border-radius: 3px; }
  .bar-actions button:hover { background: var(--surface-hover); color: var(--text); }
  .bar-actions button.delete:hover { color: var(--danger); }
  .bar-actions button:disabled { opacity: .3; }
  @media (max-width: 600px) { .selected-label { display: none; } .app-bar { gap: 10px; } .size-options button { padding: 8px; } }
</style>

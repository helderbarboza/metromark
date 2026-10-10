<script module lang="ts">
  export interface MenuItem { label: string; icon: string; action: () => void; disabled?: boolean; danger?: boolean; separator?: boolean }
</script>
<script lang="ts">
  import { onMount } from 'svelte';
  import type { TileSize } from '../types';
  import Icon from './Icon.svelte';
  let { x, y, title, subtitle, items, onclose, size, onresize }: {
    x: number; y: number; title?: string; subtitle?: string; items: MenuItem[]; onclose: () => void;
    size?: TileSize; onresize?: (size: TileSize) => void;
  } = $props();
  let element: HTMLDivElement;
  let left = $state(0);
  let top = $state(0);
  $effect(() => {
    if (!element) return;
    left = Math.max(8, Math.min(x, window.innerWidth - element.offsetWidth - 8));
    top = Math.max(8, Math.min(y, window.innerHeight - element.offsetHeight - 8));
  });
  onMount(() => {
    element.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    const click = (event: PointerEvent) => { if (!element.contains(event.target as Node)) onclose(); };
    const scroll = (event: Event) => { if (!element.contains(event.target as Node)) onclose(); };
    document.addEventListener('pointerdown', click, true);
    // Ignore the already-queued scroll that brought an off-screen group button into view.
    const frame = requestAnimationFrame(() => document.addEventListener('scroll', scroll, true));
    window.addEventListener('resize', onclose);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', click, true); document.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', onclose); };
  });
  function key(event: KeyboardEvent) {
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); onclose(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }
</script>
<div class="context-menu" role="menu" tabindex="-1" aria-label={title ? `Actions for ${title}` : 'Canvas actions'} bind:this={element} style:left="{left}px" style:top="{top}px" onkeydown={key}>
  {#if title}<div class="menu-heading"><strong>{title}</strong>{#if subtitle}<span>{subtitle}</span>{/if}</div>{/if}
  {#each items as item (item.label)}
    {#if item.separator}<div class="menu-separator" role="separator"></div>{/if}
    <button role="menuitem" class:danger={item.danger} disabled={item.disabled} onclick={() => { item.action(); onclose(); }}><Icon name={item.icon} size={15} /><span>{item.label}</span></button>
  {/each}
  {#if onresize && size}
    <div class="menu-separator" role="separator"></div><div class="size-label">TILE SIZE</div>
    <div class="sizes">{#each ['small', 'medium', 'wide', 'large'] as preset (preset)}<button class:current={size === preset} role="menuitem" aria-label="Resize to {preset}" onclick={() => { onresize?.(preset as TileSize); onclose(); }}><span class="size-box {preset}"></span><span>{preset}</span></button>{/each}</div>
  {/if}
</div>
<style>
  .context-menu { position: fixed; z-index: 100; width: 235px; padding: 6px; background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 7px; box-shadow: var(--shadow); }
  .menu-heading { padding: 10px 10px 13px; display: flex; flex-direction: column; gap: 5px; border-bottom: 1px solid var(--line); margin-bottom: 5px; }
  .menu-heading strong { font-size: 12px; font-weight: 550; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .menu-heading span { font-size: 10px; color: var(--muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  button { display: flex; width: 100%; align-items: center; gap: 10px; height: 34px; background: transparent; border-radius: 3px; padding: 0 10px; font-size: 11px; text-align: left; }
  button :global(.icon) { color: var(--muted); }
  button:hover, button:focus-visible { background: var(--surface-hover); outline: none; }
  button:disabled { opacity: .3; }
  button.danger { color: var(--danger); }
  button.danger :global(.icon) { color: var(--danger); }
  .menu-separator { height: 1px; background: var(--line); margin: 5px 3px; }
  .size-label { font-size: 8px; color: var(--muted); padding: 10px 10px 7px; letter-spacing: 1px; }
  .sizes { display: flex; gap: 4px; padding: 0 4px 5px; }
  .sizes button { display: flex; flex-direction: column; justify-content: center; gap: 6px; width: 25%; height: 48px; padding: 0; text-transform: capitalize; font-size: 8px; color: var(--muted); }
  .sizes button.current { background: var(--surface-hover); color: var(--accent); }
  .size-box { width: 12px; height: 12px; border: 1px solid currentColor; }
  .size-box.small { width: 7px; height: 7px; margin-top: 5px; }
  .size-box.wide { width: 20px; height: 10px; margin-top: 2px; }
  .size-box.large { width: 14px; height: 14px; margin-bottom: -2px; }
</style>

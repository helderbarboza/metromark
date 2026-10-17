<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { MetroTileDef, TileSize } from '../types';
  import MetroLiveFaces from './MetroLiveFaces.svelte';
  import FaviconIcon from './FaviconIcon.svelte';
  import { faviconRequestForTile } from '../icon-sources';
  import Icon from './Icon.svelte';
  let { tile, size, selected = false, revealed = false, domain = '', showDomain = true, children }: {
    tile: MetroTileDef; size: TileSize; selected?: boolean; revealed?: boolean; domain?: string;
    showDomain?: boolean; children?: Snippet;
  } = $props();
  function foreground(color: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return '#ffffff';
    const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    return 1.05 / (luminance + .05) >= 4.5 ? '#ffffff' : '#000000';
  }
  const showLive = $derived(Boolean(tile.faces?.length) && size !== 'small');
  const fg = $derived(foreground(tile.color));
  // The check is the selection mark (uwp8 pp. 80, 111) and doubles as the
  // self-revealing preview while a cross-slide gesture is still armed.
  const checked = $derived(selected || revealed);
  // Tiles render the site's original favicon, falling back to the generic
  // globe when the page has no cached favicon or conversion fails.
  const faviconRequest = $derived(faviconRequestForTile(size));
  const requestSize = $derived(faviconRequest.requestSize);
  const convertSize = $derived(faviconRequest.requestSize);
  const scaleFactor = $derived(faviconRequest.scaleFactor);

  // Metro "tilt": the tile leans away from where you press it. Purely decorative
  // press feedback (uwp8 p. 108); CSS drops it under reduced motion. Attached
  // imperatively so the visual wrapper needs no interactive ARIA role.
  function tilt(node: HTMLDivElement) {
    const lean = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      node.style.setProperty('--tilt-x', `${(-((event.clientY - rect.top) / rect.height - .5) * 14).toFixed(1)}deg`);
      node.style.setProperty('--tilt-y', `${(((event.clientX - rect.left) / rect.width - .5) * 14).toFixed(1)}deg`);
    };
    const settle = () => {
      node.style.setProperty('--tilt-x', '0deg');
      node.style.setProperty('--tilt-y', '0deg');
    };
    node.addEventListener('pointerdown', lean);
    node.addEventListener('pointerup', settle);
    node.addEventListener('pointercancel', settle);
    node.addEventListener('pointerleave', settle);
    return () => {
      node.removeEventListener('pointerdown', lean);
      node.removeEventListener('pointerup', settle);
      node.removeEventListener('pointercancel', settle);
      node.removeEventListener('pointerleave', settle);
    };
  }
</script>
<div class="metro-tile metro-tile-{size}" class:selected class:revealed style:background={tile.color} style:--tile-color={tile.color} style:--tile-fg={fg}
  {@attach tilt}>
  {#if children}
    {@render children()}
  {:else if showLive}
    <MetroLiveFaces faces={tile.faces ?? []} icon={tile.icon} period={tile.period} faviconPageUrl={tile.url} tint={fg} fallbackIcon={tile.icon ?? ''} {requestSize} {scaleFactor} />
  {:else}
    <div class="metro-tile-icon" aria-hidden="true">
      <FaviconIcon pageUrl={tile.url ?? ''} tint={fg} {requestSize} {convertSize} {scaleFactor} fallback={tile.icon ?? ''} />
    </div>
  {/if}
  {#if size !== 'small'}
    <div class="tile-label"><span class="tile-title">{tile.title}</span>{#if showDomain && domain}<span class="tile-domain">{' ' + domain}</span>{/if}</div>
  {/if}
  {#if checked}<span class="tile-check" aria-hidden="true"><Icon name="check" size={size === 'small' ? 9 : 12} /></span>{/if}
  {#if tile.badge !== undefined}<span class="tile-badge" aria-hidden="true">{tile.badge}</span>{/if}
</div>
<style>
  .metro-tile { width: 100%; height: 100%; position: relative; overflow: hidden; color: var(--tile-fg); font-family: var(--font-sans);
    transform-origin: center;
    transition: transform 160ms cubic-bezier(.1, .9, .2, 1), outline-color 130ms, box-shadow 160ms, opacity 160ms; }
  .metro-tile:hover { outline: 2px solid color-mix(in srgb, var(--tile-fg) 35%, transparent); outline-offset: -2px; }
  .metro-tile:active { transform: perspective(600px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(.97); }
  /* Selection reads as a shape, not only a color: inset outline plus a corner check. */
  .metro-tile.selected { outline: 3px solid var(--tile-fg); outline-offset: -3px; }
  /* Self-revealing cross-slide (uwp8 p. 111): the tile slides down to show the check it would get. */
  .metro-tile.revealed { transform: translateY(6px); }
  .metro-tile.revealed:active { transform: translateY(6px) perspective(600px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(.97); }
  :global(.metro-tile-icon) { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; padding-bottom: 24px; }
  :global(.metro-tile-icon svg), :global(.metro-tile-icon img) { width: 44px; height: 44px; }
  .metro-tile-small .metro-tile-icon { padding-bottom: 0; }
  .metro-tile-small .metro-tile-icon :global(svg), .metro-tile-small .metro-tile-icon :global(img) { width: 26px; height: 26px; }
  .metro-tile-wide .metro-tile-icon { padding-bottom: 24px; }
  .metro-tile-wide .metro-tile-icon :global(svg), .metro-tile-wide .metro-tile-icon :global(img) { width: 48px; height: 48px; }
  .metro-tile-large .metro-tile-icon { padding-bottom: 26px; }
  .metro-tile-large .metro-tile-icon :global(svg), .metro-tile-large .metro-tile-icon :global(img) { width: 80px; height: 80px; }
  .tile-label { position: absolute; left: 12px; right: 12px; bottom: 10px; display: flex; flex-direction: column; text-align: left; gap: 2px; }
  .tile-title { font-size: 12px; font-weight: 600; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile-domain { font-size: 11px; font-weight: 400; line-height: 1.35; opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .metro-tile-large .tile-label { left: 14px; right: 14px; bottom: 12px; }
  .metro-tile-large .tile-title { font-size: 15px; }
  .metro-tile-large .tile-domain { font-size: 12px; }
  /* Corner check: a triangle of the foreground color with the check cut from the tile color. */
  .tile-check { position: absolute; top: 0; right: 0; width: 26px; height: 26px; display: flex; align-items: flex-start; justify-content: flex-end; padding: 1px 2px 0 0; background: var(--tile-fg); clip-path: polygon(100% 0, 0 0, 100% 100%); color: var(--tile-color); }
  .metro-tile-small .tile-check { width: 18px; height: 18px; }
  .tile-badge { position: absolute; left: 12px; top: 10px; min-width: 22px; height: 22px; padding: 0 6px; display: flex; align-items: center; justify-content: center; border-radius: 11px; background: var(--tile-fg); color: var(--tile-color); font-size: 12px; font-weight: 600; line-height: 1; }
  @media (prefers-reduced-motion: reduce) {
    .metro-tile { transition: none; }
    .metro-tile:active, .metro-tile.revealed, .metro-tile.revealed:active { transform: none; }
  }
  /* The in-app reduced-motion setting disables the same press motion. */
  :global(.reduced) .metro-tile:active, :global(.reduced) .metro-tile.revealed, :global(.reduced) .metro-tile.revealed:active { transform: none; }
</style>

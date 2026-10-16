<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { MetroTileDef, TileSize } from '../types';
  import MetroLiveFaces from './MetroLiveFaces.svelte';
  import FaviconIcon from './FaviconIcon.svelte';
  import { faviconRequestForTile } from '../icon-sources';
  import Icon from './Icon.svelte';
  let { tile, size, selected = false, domain = '', showDomain = true, arranging = false, children }: {
    tile: MetroTileDef; size: TileSize; selected?: boolean; domain?: string;
    showDomain?: boolean; arranging?: boolean; children?: Snippet;
  } = $props();
  function foreground(color: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return '#ffffff';
    const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    return 1.05 / (luminance + .05) >= 4.5 ? '#ffffff' : '#000000';
  }
  const showLive = $derived(Boolean(tile.faces?.length) && size !== 'small');
  const fg = $derived(foreground(tile.color));
  // Tiles render the site's original favicon, falling back to the generic
  // globe when the page has no cached favicon or conversion fails.
  const faviconRequest = $derived(faviconRequestForTile(size));
  const requestSize = $derived(faviconRequest.requestSize);
  const convertSize = $derived(faviconRequest.requestSize);
  const scaleFactor = $derived(faviconRequest.scaleFactor);
</script>
<div class="metro-tile metro-tile-{size}" class:selected style:background={tile.color} style:--tile-color={tile.color} style:--tile-fg={fg}>
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
  {#if selected}<span class="tile-check"><Icon name="check" size={12} /></span>
  {:else if arranging}<span class="tile-grip" aria-hidden="true">⠿</span>{/if}
  {#if tile.badge !== undefined}<span class="tile-badge" aria-hidden="true">{tile.badge}</span>{/if}
</div>
<style>
  .metro-tile { width: 100%; height: 100%; position: relative; overflow: hidden; color: var(--tile-fg); font-family: var(--font-sans); transition: filter 130ms; }
  .metro-tile:hover { filter: brightness(1.06); }
  .metro-tile:active { filter: brightness(.94); }
  .metro-tile.selected { outline: 2px solid var(--tile-fg); outline-offset: -2px; }
  :global(.metro-tile-icon) { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; padding-bottom: 24px; }
  .metro-tile-icon :global(svg), .metro-tile-icon :global(img) { width: 44px; height: 44px; }
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
  .tile-check { position: absolute; right: 0; top: 0; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: var(--tile-fg); color: var(--tile-color); }
  .tile-grip { position: absolute; right: 10px; top: 8px; color: var(--tile-fg); opacity: .7; font-size: 16px; line-height: 1; }
  .tile-badge { position: absolute; left: 12px; top: 10px; min-width: 22px; height: 22px; padding: 0 6px; display: flex; align-items: center; justify-content: center; border-radius: 11px; background: var(--tile-fg); color: var(--tile-color); font-size: 12px; font-weight: 600; line-height: 1; }
  @media (prefers-reduced-motion: reduce) {
    .metro-tile { transition: none; }
  }
</style>

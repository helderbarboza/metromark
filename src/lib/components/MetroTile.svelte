<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Density, MetroTileDef, TileSize } from "../types";
  import MetroLiveFaces from "./MetroLiveFaces.svelte";
  import FaviconIcon from "./FaviconIcon.svelte";
  import { faviconRequestForTile } from "../icon-sources";
  import Icon from "./Icon.svelte";
  let {
    tile,
    size,
    density = "default",
    selected = false,
    domain = "",
    showDomain = true,
    arranging = false,
    children,
  }: {
    tile: MetroTileDef;
    size: TileSize;
    density?: Density;
    selected?: boolean;
    domain?: string;
    showDomain?: boolean;
    arranging?: boolean;
    children?: Snippet;
  } = $props();
  function foreground(color: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return "#ffffff";
    const channels = [1, 3, 5]
      .map((start) => parseInt(color.slice(start, start + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      );
    const luminance =
      0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    return 1.05 / (luminance + 0.05) >= 4.5 ? "#ffffff" : "#000000";
  }
  const showLive = $derived(Boolean(tile.faces?.length) && size !== "small");
  const fg = $derived(foreground(tile.color));
  // Explicit icon choices win over favicons. Automatic tiles (globe key)
  // attempt the site's original favicon; anything else renders bundled SVG.
  const useFavicon = $derived(
    (tile.iconKey ?? "globe") === "globe" && Boolean(tile.url?.trim()),
  );
  const faviconRequest = $derived(faviconRequestForTile(size));
  const requestSize = $derived(faviconRequest.requestSize);
  const convertSize = $derived(faviconRequest.requestSize);
  const scaleFactor = $derived(faviconRequest.scaleFactor);
</script>

<div
  class="metro-tile metro-tile-{size} density-{density}"
  class:selected
  style:background={tile.color}
  style:--tile-color={tile.color}
  style:--tile-fg={fg}
>
  {#if size === "large"}<div class="tile-decoration" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>{/if}
  {#if children}
    {@render children()}
  {:else if showLive}
    <MetroLiveFaces
      faces={tile.faces ?? []}
      icon={tile.icon}
      period={tile.period}
      faviconPageUrl={useFavicon ? tile.url : undefined}
      tint={fg}
      fallbackIcon={tile.icon ?? ""}
      {requestSize}
      {scaleFactor}
    />
  {:else}
    <div class="metro-tile-icon" aria-hidden="true">
      {#if useFavicon}
        <FaviconIcon
          pageUrl={tile.url ?? ""}
          tint={fg}
          {requestSize}
          {convertSize}
          {scaleFactor}
          fallback={tile.icon ?? ""}
        />
      {:else}
        <!-- Safe: icons are selected from our bundled SVG registry, never the bookmark title/URL. -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html tile.icon ?? ""}
      {/if}
    </div>
  {/if}
  {#if size !== "small"}
    <div class="tile-label">
      <span class="tile-title">{tile.title}</span
      >{#if showDomain && domain}<span class="tile-domain">{" " + domain}</span
        >{/if}
    </div>
  {/if}
  {#if selected}<span class="tile-check"><Icon name="check" size={12} /></span>
  {:else if arranging}<span class="tile-grip" aria-hidden="true">⠿</span>
  {:else}<span class="tile-open" aria-hidden="true"
      ><Icon name="arrow" size={14} /></span
    >{/if}
  {#if tile.badge !== undefined}<span class="tile-badge">{tile.badge}</span
    >{/if}
</div>

<style>
  .metro-tile {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    color: var(--tile-fg);
    isolation: isolate;
    transition:
      filter 130ms,
      transform 130ms,
      outline 130ms;
  }
  .metro-tile::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, transparent 52%, #0000000c);
    z-index: -1;
  }
  .metro-tile:hover {
    filter: brightness(1.08);
    outline: 1px solid #ffffff60;
    outline-offset: -1px;
  }
  .metro-tile:active {
    transform: scale(0.975);
  }
  .metro-tile.selected {
    outline: 2px solid #fff;
    outline-offset: -2px;
  }
  :global(.metro-tile-icon) {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-bottom: 25px;
  }
  .metro-tile-icon :global(svg),
  .metro-tile-icon :global(img) {
    width: 48px;
    height: 48px;
  }
  .metro-tile-small .metro-tile-icon {
    padding-bottom: 0;
  }
  .metro-tile-small .metro-tile-icon :global(svg),
  .metro-tile-small .metro-tile-icon :global(img) {
    width: 24px;
    height: 24px;
  }
  .metro-tile-wide .metro-tile-icon {
    justify-content: flex-start;
    padding: 0 0 21px 25px;
  }
  .metro-tile-wide .metro-tile-icon :global(svg),
  .metro-tile-wide .metro-tile-icon :global(img) {
    width: 48px;
    height: 48px;
  }
  .metro-tile-large .metro-tile-icon {
    padding-bottom: 26px;
  }
  .metro-tile-large .metro-tile-icon :global(svg),
  .metro-tile-large .metro-tile-icon :global(img) {
    width: 96px;
    height: 96px;
  }
  .density-compact .metro-tile-icon :global(svg),
  .density-compact .metro-tile-icon :global(img),
  .density-small .metro-tile-icon :global(svg),
  .density-small .metro-tile-icon :global(img) {
    width: 32px;
    height: 32px;
  }
  .density-compact.metro-tile-large .metro-tile-icon :global(svg),
  .density-compact.metro-tile-large .metro-tile-icon :global(img),
  .density-small.metro-tile-large .metro-tile-icon :global(svg),
  .density-small.metro-tile-large .metro-tile-icon :global(img) {
    width: 64px;
    height: 64px;
  }
  .density-compact.metro-tile-small .metro-tile-icon :global(svg),
  .density-compact.metro-tile-small .metro-tile-icon :global(img),
  .density-small.metro-tile-small .metro-tile-icon :global(svg),
  .density-small.metro-tile-small .metro-tile-icon :global(img) {
    width: 16px;
    height: 16px;
  }
  .density-half .metro-tile-icon :global(svg),
  .density-half .metro-tile-icon :global(img) {
    width: 24px;
    height: 24px;
  }
  .density-half.metro-tile-large .metro-tile-icon :global(svg),
  .density-half.metro-tile-large .metro-tile-icon :global(img) {
    width: 48px;
    height: 48px;
  }
  .density-half.metro-tile-small .metro-tile-icon :global(svg),
  .density-half.metro-tile-small .metro-tile-icon :global(img) {
    width: 16px;
    height: 16px;
  }
  .tile-label {
    position: absolute;
    left: 15px;
    right: 13px;
    bottom: 13px;
    display: flex;
    flex-direction: column;
    text-align: left;
    gap: 4px;
  }
  .tile-title {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: -0.1px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile-domain {
    font-size: 9px;
    font-weight: 400;
    color: var(--tile-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .metro-tile-large .tile-label {
    left: 20px;
    bottom: 18px;
    gap: 5px;
  }
  .metro-tile-large .tile-title {
    font-size: 17px;
    font-weight: 450;
  }
  .metro-tile-large .tile-domain {
    font-size: 10px;
  }
  .metro-tile-wide .tile-label {
    left: 25px;
  }
  .tile-open {
    position: absolute;
    right: 13px;
    top: 13px;
    color: #ffffff6b;
    opacity: 0;
    transform: translate(-3px, 3px);
    transition:
      opacity 130ms,
      transform 130ms;
  }
  .metro-tile:hover .tile-open {
    opacity: 1;
    transform: none;
  }
  .tile-check {
    position: absolute;
    right: 0;
    top: 0;
    background: white;
    color: #2c3033;
    padding: 5px;
  }
  .tile-grip {
    position: absolute;
    right: 10px;
    top: 8px;
    color: #ffffffa0;
    font-size: 19px;
  }
  .tile-badge {
    position: absolute;
    right: 10px;
    bottom: 10px;
    font-size: 12px;
  }
  .tile-decoration {
    position: absolute;
    width: 180px;
    height: 180px;
    top: -35px;
    right: -35px;
    border: 1px solid #ffffff0a;
    transform: rotate(40deg);
    z-index: -1;
  }
  .tile-decoration span {
    display: block;
    height: 60px;
    border-bottom: 1px solid #ffffff0a;
  }
</style>

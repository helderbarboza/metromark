<script lang='ts'>
  import type { BookmarkTileDef } from '$lib/types'
  import type { Snippet } from 'svelte'
  import type { CommonTileProps, TileContentArgs } from '../tile-props'
  import FaviconImage from '$lib/components/molecules/FaviconImage.svelte'

  import { GAP } from '$lib/layout'
  import { getTileGrid as getTileGridContext, hasTileGrid } from '$lib/tile-grid-context'
  import { cn } from 'tailwind-variants'
  import TileShell from '../molecules/TileShell.svelte'
  import { tileVariants } from '../tile-variants'

  interface Props extends CommonTileProps {
    tile: BookmarkTileDef
    /** Rendered element: 'a' when the tile launches a URL, 'button' otherwise. */
    as?: 'a' | 'button'
    href?: string
    target?: string
    rel?: string
    domain?: string
    showDomain?: boolean
    children?: Snippet
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    as = 'a',
    href,
    target,
    rel = 'noopener noreferrer',
    domain = '',
    showDomain = true,
    children,
    dataTestId = 'bookmark-tile',
    tooltip,
    ...rest
  }: Props = $props()

  const readTileGrid = hasTileGrid() ? getTileGridContext() : undefined
  const cell = $derived(readTileGrid?.().cell)
  const gap = $derived(readTileGrid?.().gap ?? GAP)
  const fallbackOpenLabel = $derived(
    `Open ${tile.title}${showDomain && domain && size !== 'small'
      ? ` ${domain}`
      : ''}`,
  )

  const ui = $derived(tileVariants({ size, selected, revealed }))
</script>

<TileShell
  {...rest}
  {tile}
  {size}
  {selected}
  {revealed}
  {as}
  {href}
  {target}
  {rel}
  dataTestId={dataTestId}
  cell={cell}
  gap={gap}
  defaultLabel={fallbackOpenLabel}
  resizeNoun='tile'
  tooltip={tooltip ?? (tile.url ? `${tile.title} — ${tile.url}` : tile.title)}
>
  {#snippet content({ fg }: TileContentArgs)}
    {#if children}
      {@render children()}
    {:else}
      <div
        class={cn(ui.icon(), ui.background())}
        aria-hidden='true'
      >
        <FaviconImage
          pageUrl={tile.url ?? ''}
          tint={fg}
          class={cn({
            'size-[min(calc(var(--cell)*0.75),2.0rem)]': size === 'small',
            'size-[min(calc(var(--cell)*0.75),3.5rem)]': size === 'medium',
            'size-[min(calc(var(--cell)*0.75),4.0rem)]': size === 'wide',
            'size-[min(calc(var(--cell)*1.00),5.0rem)]': size === 'large',
          })}
        />
      </div>
    {/if}
    {#if size !== 'small'}
      <div class={ui.labelContainer()}>
        <div class={ui.label()}>
          <span class={cn(ui.title(), 'order-2')}>{tile.title}</span>
          {#if showDomain && domain}
            <span class={cn(ui.domain(), 'order-1')}>{domain}</span>
          {/if}
        </div>
      </div>
    {/if}
    {#if tile.badge !== undefined}
      <span class={ui.badge()} aria-hidden='true'>{tile.badge}</span>
    {/if}
  {/snippet}
</TileShell>

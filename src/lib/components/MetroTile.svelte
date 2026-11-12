<script lang='ts'>
  import type { MetroTileDef, TileSize } from '$lib/types'
  import type { Snippet } from 'svelte'
  import FaviconIcon from '$lib/components/FaviconIcon.svelte'
  import Icon from '$lib/components/Icon.svelte'

  import { GAP, TILE_SIZES } from '$lib/layout'
  import { resolveTileColors } from '$lib/theme-colors'
  import { getTileGrid as getTileGridContext, hasTileGrid } from '$lib/tile-grid-context'
  import { safeUrl } from '$lib/url'
  import { mode, theme } from 'mode-watcher'
  import { cn } from 'tailwind-variants'
  import { tileVariants } from './tile-variants'
  import { tilt } from './tilt'
  import Button from './ui/button/button.svelte'

  interface Props {
    tile: MetroTileDef
    size: TileSize
    selected?: boolean
    revealed?: boolean
    domain?: string
    showDomain?: boolean
    children?: Snippet
    /** Rendered element: 'a' when the tile launches a URL, 'button' otherwise. */
    as?: 'a' | 'button'
    href?: string
    target?: string
    rel?: string
    tooltip?: string
    ariaLabel?: string
    ariaRoleDescription?: string
    draggable?: boolean
    class?: string
    style?: string
    dataTestId?: string
    dataGridId?: string
    /** Tile id for plain (non-draggable) tiles so context menus can find the owner. */
    dataTileId?: string
    dataDragging?: boolean
    attach?: (node: HTMLElement) => void | (() => void)
    /** Called with the target size on quick grow/shrink tap. Omit to hide it. */
    onresize?: (size: TileSize) => void
    onclick?: (event: MouseEvent) => void
    onpointerdown?: (event: PointerEvent) => void
    onpointermove?: (event: PointerEvent) => void
    onpointerup?: (event: PointerEvent) => void
    onpointercancel?: (event: PointerEvent) => void
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    domain = '',
    showDomain = true,
    children,
    as = 'a',
    href,
    target,
    rel = 'noopener noreferrer',
    tooltip,
    ariaLabel,
    ariaRoleDescription,
    draggable = false,
    class: className,
    style,
    dataTestId = 'metro-tile',
    dataGridId,
    dataTileId,
    dataDragging,
    attach,
    onresize,
    onclick,
    onpointerdown,
    onpointermove,
    onpointerup,
    onpointercancel,
    ...rest
  }: Props = $props()

  const readTileGrid = hasTileGrid() ? getTileGridContext() : undefined
  const cell = $derived(readTileGrid?.().cell)
  const gap = $derived(readTileGrid?.().gap ?? GAP)
  const isLink = $derived(as === 'a')
  const launchHref = $derived(href ?? safeUrl(tile.url ?? ''))
  const elementProps = $derived(isLink
    ? { href: launchHref, target, rel }
    : { type: 'button' as const })
  const fallbackOpenLabel = $derived(
    `Open ${tile.title}${showDomain && domain && size !== 'small'
      ? ` ${domain}`
      : ''}`,
  )
  const openLabel = $derived(ariaLabel ?? fallbackOpenLabel)

  // Reactive colors that update when theme/mode changes
  let colors = $derived(resolveTileColors(tile))
  const bgColor = $derived(colors.bg)
  const fg = $derived(colors.fg === 1 ? '#ffffff' : '#000000')

  // Update colors when theme/mode changes
  $effect(() => {
    // Read theme/mode to create reactive dependency
    void mode.current
    void theme.current
    // Update colors when theme/mode changes
    colors = resolveTileColors(tile)
  })

  const checked = $derived(selected || revealed)

  // Quick resize: grow through small → medium → wide → large, then wrap
  // straight back to small. Null when the parent does not want the button
  // (e.g. read-only tiles).
  const quickResize = $derived.by(():
    { target: TileSize, direction: 'grow' | 'shrink' } | null => {
    if (!onresize)
      return null
    if (size === 'large')
      return { target: 'small', direction: 'shrink' }
    const index = TILE_SIZES.indexOf(size)
    return { target: TILE_SIZES[index + 1], direction: 'grow' }
  })

  const ui = $derived(tileVariants({ size, selected, revealed }))

// tilt is shared with FolderTile.
</script>

<div
  class={cn('relative size-full', className)}
  data-dragging={dataDragging || undefined}
  style={style}
  {...rest}
>
  <svelte:element
    this={isLink ? 'a' : 'button'}
    class={ui.root()}
    data-testid={dataTestId}
    data-size={size}
    data-selected={selected || undefined}
    data-grid-id={dataGridId}
    data-tile-id={dataTileId}
    {...elementProps}
    title={tooltip ?? (tile.url ? `${tile.title} — ${tile.url}` : tile.title)}
    aria-label={openLabel}
    aria-roledescription={ariaRoleDescription}
    draggable={draggable}
    style:--tile-bg={bgColor}
    style:--tile-fg={fg}
    style:--cell={cell !== undefined ? `${cell}px` : undefined}
    style:--gap={gap !== undefined ? `${gap}px` : undefined}
  {@attach tilt}
  {@attach attach ?? (() => {})}
    onclick={onclick}
    onpointerdown={onpointerdown}
    onpointermove={onpointermove}
    onpointerup={onpointerup}
    onpointercancel={onpointercancel}
  >
    {#if children}
      {@render children()}
    {:else}
      <div
        class={cn(ui.icon(), ui.background())}
        aria-hidden='true'
      >
        <FaviconIcon
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
          {#if showDomain && domain}
            <span class={ui.domain()}>{domain}</span>
          {/if}
          <span class={ui.title()}>{tile.title}</span>
        </div>
      </div>
    {/if}
    {#if checked}
      <span class={ui.check()} aria-hidden='true'>
        <Icon name='check' class='size-4' />
      </span>
    {/if}
    {#if tile.badge !== undefined}
      <span class={ui.badge()} aria-hidden='true'>{tile.badge}</span>
    {/if}
  </svelte:element>
  {#if checked && quickResize}
    <Button
      variant='secondary'
      size='icon-xs'
      class='
        absolute right-0 bottom-0 z-2 translate-1.5 rounded-full border-border/60
        shadow-sm
      '
      aria-label={quickResize.direction === 'grow'
        ? `Grow ${tile.title} tile to ${quickResize.target}`
        : `Shrink ${tile.title} tile to ${quickResize.target}`}
      onpointerdown={event => event.stopPropagation()}
      onclick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const target = quickResize?.target
        if (target)
          onresize?.(target)
      }}
    >
      <Icon
        class='size-3.5'
        name={quickResize.direction === 'grow' ? 'arrowDownRight' : 'arrowUpLeft'}
      />
    </Button>
  {/if}
</div>

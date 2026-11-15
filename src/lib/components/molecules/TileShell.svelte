<script lang='ts'>
  import type { TileSize } from '$lib/types'
  import type { Snippet } from 'svelte'
  import type { CommonTileProps, TileContentArgs } from '../tile-props'
  import Icon from '$lib/components/atoms/Icon.svelte'

  import { TILE_SIZES } from '$lib/layout'
  import { resolveTileColors } from '$lib/theme-colors'
  import { safeUrl } from '$lib/url'
  import { mode, theme } from 'mode-watcher'
  import { cn } from 'tailwind-variants'
  import { tileVariants } from '../tile-variants'
  import { tilt } from '../tilt'
  import Button from '../ui/button/button.svelte'

  /** Subset of the tile view the shell needs: label text and accent colors. */
  interface ShellTile {
    title: string
    url?: string
    colorIndex: number
    color?: string
  }

  interface Props extends CommonTileProps {
    tile: ShellTile
    /** Rendered element: 'a' when the tile launches a URL, 'button' otherwise. */
    as?: 'a' | 'button'
    href?: string
    target?: string
    rel?: string
    /** Fallback for aria-label when the parent does not set one. */
    defaultLabel: string
    /** Noun in the quick-resize button label, e.g. 'tile' or 'folder tile'. */
    resizeNoun?: string
    /** Tile-grid cell size in px. Sets --cell on the interactive element. */
    cell?: number
    /** Tile-grid gap in px. Sets --gap on the interactive element. */
    gap?: number
    /** Tile body. Receives the resolved background and foreground colors. */
    content: Snippet<[TileContentArgs]>
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    as = 'button',
    href,
    target,
    rel = 'noopener noreferrer',
    defaultLabel,
    resizeNoun = 'tile',
    cell,
    gap,
    content,
    class: className,
    style,
    dataTestId,
    dataGridId,
    dataTileId,
    dataDragging,
    attach,
    draggable = false,
    ariaLabel,
    ariaRoleDescription,
    tooltip,
    onresize,
    onclick,
    onpointerdown,
    onpointermove,
    onpointerup,
    onpointercancel,
    ...rest
  }: Props = $props()

  const isLink = $derived(as === 'a')
  const launchHref = $derived(href ?? safeUrl(tile.url ?? ''))
  const elementProps = $derived(isLink
    ? { href: launchHref, target, rel }
    : { type: 'button' as const })
  const openLabel = $derived(ariaLabel ?? defaultLabel)

  // Reactive colors that update when theme/mode changes
  let colors = $derived(resolveTileColors(tile))
  const bg = $derived(colors.bg)
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

  const ui = $derived(tileVariants({ size, selected, revealed }))

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
    title={tooltip ?? tile.title}
    aria-label={openLabel}
    aria-roledescription={ariaRoleDescription}
    draggable={draggable}
    style:--tile-bg={bg}
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
    {@render content({ bg, fg })}
    {#if checked}
      <span class={ui.check()} aria-hidden='true'>
        <Icon name='check' class='size-4' />
      </span>
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
        ? `Grow ${tile.title} ${resizeNoun} to ${quickResize.target}`
        : `Shrink ${tile.title} ${resizeNoun} to ${quickResize.target}`}
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

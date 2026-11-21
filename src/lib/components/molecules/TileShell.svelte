<script lang='ts'>
  import type { CommonTileProps, TileContentArgs } from '$lib/components/tile-props'
  import type { TileSize } from '$lib/types'
  import type { Snippet } from 'svelte'
  import LL from '$i18n/i18n-svelte'

  import Icon from '$lib/components/atoms/Icon.svelte'
  import { tileVariants } from '$lib/components/tile-variants'
  import { tilt } from '$lib/components/tilt'
  import Button from '$lib/components/ui/button/button.svelte'
  import { SETTINGS_DEFAULTS } from '$lib/config'
  import { TILE_SIZES } from '$lib/layout'
  import { resolveTileColors } from '$lib/theme-colors'
  import { cn } from '$lib/utils.js'
  import { getWorkspace, hasWorkspace } from '$lib/workspace-context'
  import { mode, theme } from 'mode-watcher'
  import { quadOut } from 'svelte/easing'
  import { scale } from 'svelte/transition'

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

  // Tile enter/exit motion. Svelte transitions run on WAAPI, so they do not
  // conflict with the CSS transform transitions for tilt and reveal. Enter
  // keeps opacity 1 (jest-dom treats opacity 0 as not visible); exit may fade.
  const readWorkspace = hasWorkspace()
    ? getWorkspace()
    : undefined
  const allowedSizes = $derived(readWorkspace?.().sizes ?? TILE_SIZES)
  const reducedMotion = $derived(readWorkspace?.().reducedMotion ?? SETTINGS_DEFAULTS.reducedMotion)

  const isLink = $derived(as === 'a')
  const launchHref = $derived(href ?? tile.url ?? '')
  const elementProps = $derived(isLink
    ? { href: launchHref, target, rel }
    : { type: 'button' as const })
  const openLabel = $derived(ariaLabel ?? defaultLabel)

  // Reactive colors that update when theme/mode changes
  let colors = $derived(resolveTileColors(tile))
  const bg = $derived(colors.bg)
  const fg = $derived(colors.fg === 1
    ? '#ffffff'
    : '#000000')

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

  // Quick resize: grow through the view's preset list, then wrap straight
  // back to the first. Null when the parent does not want the button
  // (e.g. read-only tiles).
  const quickResize = $derived.by(():
    { target: TileSize, direction: 'grow' | 'shrink' } | null => {
    if (!onresize)
      return null
    const index = allowedSizes.indexOf(size)
    if (index === -1 || index === allowedSizes.length - 1)
      return { target: allowedSizes[0], direction: 'shrink' }
    return { target: allowedSizes[index + 1], direction: 'grow' }
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
    in:scale|global={{
      start: 0.94,
      opacity: 0.8,
      easing: quadOut,
      duration: reducedMotion ? 0 : 360,
    }}
    out:scale={{
      start: 0.94,
      opacity: 0,
      duration: reducedMotion ? 0 : 360,
    }}
    style:--tile-bg={bg}
    style:--tile-fg={fg}
    style:--cell={cell !== undefined
      ? `${cell}px`
      : undefined}
    style:--gap={gap !== undefined
      ? `${gap}px`
      : undefined}
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
        ? $LL.app.growTile({
          name: tile.title,
          noun: resizeNoun,
          size: $LL.tileSizes[quickResize.target](),
        })
        : $LL.app.shrinkTile({
          name: tile.title,
          noun: resizeNoun,
          size: $LL.tileSizes[quickResize.target](),
        })}
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
        name={quickResize.direction === 'grow'
          ? 'arrowDownRight'
          : 'arrowUpLeft'}
      />
    </Button>
  {/if}
</div>

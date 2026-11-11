<script lang='ts' module>
  import { cn, tv } from 'tailwind-variants'

  export const tileVariants = tv({
    slots: {
      root: `
        metro-tile relative block size-full border border-border/50 bg-(--tile-bg)
        font-sans text-(--tile-fg) no-underline
        transition-[transform,scale,outline-color,box-shadow,opacity] duration-160
        ease-fluent
        hover:outline-2 hover:-outline-offset-2 hover:outline-(--tile-fg)/35
        focus-visible:z-2 focus-visible:outline-[3px] focus-visible:outline-offset-3
        focus-visible:outline-(--primary)
        in-[.reduced]:active:transform-none
        motion-reduce:transition-none
        motion-reduce:active:transform-none
      `,
      icon: `absolute inset-0 flex items-center justify-center`,
      label: `absolute inset-x-0 bottom-0 mx-4 mb-2 flex translate-y-1 flex-col text-left`,
      title: 'truncate text-xs/tight font-normal',
      domain: `truncate text-[10px]/tight font-normal`,
      check: `
        absolute top-0 right-0 flex items-start justify-end bg-(--tile-fg) pb-3 pl-3
        text-(--tile-bg) [clip-path:polygon(100%_0,0_0,100%_100%)]
      `,
      badge: `
        absolute top-2.5 left-3 flex h-5.5 min-w-5.5 items-center justify-center
        rounded-[11px] bg-(--tile-fg) px-1.5 text-xs leading-none font-semibold
        text-(--tile-bg)
      `,
    },
    variants: {
      size: {
        small: {
          icon: `pb-0`,
        },
        medium: {
          icon: `pb-6`,
        },
        wide: {
          icon: `pb-6`,
        },
        large: {
          icon: `pb-6.5`,
        },
      },
      selected: {
        true: {
          root: `
            selected outline-[3px] outline-offset-[-3px] outline-(--tile-fg)
            hover:outline-[3px] hover:outline-offset-[-3px] hover:outline-(--tile-fg)
          `,
        },
      },
      revealed: {
        false: {
          root: `
            active:transform-[perspective(600px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))_scale(.97)]
          `,
        },
        true: {
          root: `
            revealed translate-y-1.5
            active:transform-[translateY(6px)_perspective(600px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))_scale(.97)]
          `,
        },
      },
    },
    defaultVariants: {
      size: 'medium',
      selected: false,
      revealed: false,
    },
  })
</script>

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
  import Button from './ui/button/button.svelte'

  interface Props {
    tile: MetroTileDef
    size: TileSize
    selected?: boolean
    revealed?: boolean
    domain?: string
    showDomain?: boolean
    children?: Snippet
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
    attach?: (node: HTMLAnchorElement) => void | (() => void)
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
  }: Props = $props()

  const readTileGrid = hasTileGrid() ? getTileGridContext() : undefined
  const cell = $derived(readTileGrid?.().cell)
  const gap = $derived(readTileGrid?.().gap ?? GAP)
  const launchHref = $derived(href ?? safeUrl(tile.url ?? ''))
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

  // Metro "tilt": the tile leans away from where you press it. Purely decorative
  // press feedback (uwp8 p. 108); CSS drops it under reduced motion. Attached
  // imperatively so the visual wrapper needs no interactive ARIA role.
  function tilt(node: HTMLElement) {
    const lean = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      if (!rect.width || !rect.height)
        return
      node.style.setProperty(
        '--tilt-x',
        `${(-((event.clientY - rect.top) / rect.height - 0.5) * 14).toFixed(1)}deg`,
      )
      node.style.setProperty(
        '--tilt-y',
        `${(((event.clientX - rect.left) / rect.width - 0.5) * 14).toFixed(1)}deg`,
      )
    }
    const settle = () => {
      node.style.setProperty('--tilt-x', '0deg')
      node.style.setProperty('--tilt-y', '0deg')
    }
    node.addEventListener('pointerdown', lean)
    node.addEventListener('pointerup', settle)
    node.addEventListener('pointercancel', settle)
    node.addEventListener('pointerleave', settle)
    return () => {
      node.removeEventListener('pointerdown', lean)
      node.removeEventListener('pointerup', settle)
      node.removeEventListener('pointercancel', settle)
      node.removeEventListener('pointerleave', settle)
    }
  }
</script>

<div
  class={cn('relative size-full', className)}
  data-dragging={dataDragging || undefined}
  style={style}
>
  <a
    class={ui.root()}
    data-testid={dataTestId}
    data-size={size}
    data-selected={selected || undefined}
    data-grid-id={dataGridId}
    data-tile-id={dataTileId}
    href={launchHref}
    {target}
    {rel}
    title={tooltip ?? `${tile.title} — ${tile.url}`}
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
        class={ui.icon()}
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
      <div class={ui.label()}>
        <span class={ui.title()}>{tile.title}</span>
        {#if showDomain && domain}
          <span class={ui.domain()}>{domain}</span>
        {/if}
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
  </a>
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

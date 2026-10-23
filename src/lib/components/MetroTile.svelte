<script lang='ts' module>
  import { tv } from 'tailwind-variants'

  export const tileVariants = tv({
    slots: {
      root: `
        metro-tile relative size-full overflow-hidden bg-(--tile-bg) font-sans
        text-(--tile-fg) transition-[transform,outline-color,box-shadow,opacity]
        duration-160 ease-[cubic-bezier(0.1,0.9,0.2,1)]
        hover:outline-2 hover:-outline-offset-2 hover:outline-(--tile-fg)/35
        in-[.reduced]:active:transform-none
        motion-reduce:transition-none
        motion-reduce:active:transform-none
      `,
      icon: `
        metro-tile-icon absolute inset-0 flex items-center justify-center
        **:blur-[0.5px] **:[image-rendering:smooth]
      `,
      label: 'absolute inset-x-2.5 bottom-1.5 flex flex-col gap-0.5 text-left',
      title: 'truncate text-xs leading-[1.35] font-normal',
      domain: 'truncate text-[10px] leading-[1.35] font-normal opacity-[.7]',
      check: `
        absolute top-0 right-0 flex items-start justify-end bg-(--tile-fg) pt-px
        pr-0.5 text-(--tile-bg) [clip-path:polygon(100%_0,0_0,100%_100%)]
      `,
      badge: `
        absolute top-2.5 left-3 flex h-[22px] min-w-[22px] items-center
        justify-center rounded-[11px] bg-(--tile-fg) px-1.5 text-xs leading-none
        font-semibold text-(--tile-bg)
      `,
    },
    variants: {
      size: {
        small: {
          root: 'metro-tile-small',
          icon: `
            pb-0
            [&_img]:size-[32px]
            [&_svg]:size-[32px]
          `,
          check: 'size-[18px]',
        },
        medium: {
          root: 'metro-tile-medium',
          icon: `
            pb-6
            [&_img]:size-[56px]
            [&_svg]:size-[56px]
          `,
        },
        wide: {
          root: 'metro-tile-wide',
          icon: `
            pb-6
            [&_img]:size-[64px]
            [&_svg]:size-[64px]
          `,
        },
        large: {
          root: 'metro-tile-large',
          icon: `
            pb-[26px]
            [&_img]:size-[80px]
            [&_svg]:size-[80px]
          `,
        },
      },
      selected: {
        true: {
          root: `
            selected outline-[3px] outline-offset-[-3px] outline-(--tile-fg)
            hover:outline-[3px] hover:outline-offset-[-3px]
            hover:outline-(--tile-fg)
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
            revealed translate-y-[6px]
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
  import type { Snippet } from 'svelte'
  import type { MetroTileDef, TileSize } from '../types'
  import { mode, theme } from 'mode-watcher'
  import { resolveTileColors } from '../theme-colors'
  import FaviconIcon from './FaviconIcon.svelte'
  import Icon from './Icon.svelte'
  import MetroLiveFaces from './MetroLiveFaces.svelte'

  interface Props {
    tile: MetroTileDef
    size: TileSize
    selected?: boolean
    revealed?: boolean
    domain?: string
    showDomain?: boolean
    children?: Snippet
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    domain = '',
    showDomain = true,
    children,
  }: Props = $props()

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

  const showLive = $derived(Boolean(tile.faces?.length) && size !== 'small')
  const checked = $derived(selected || revealed)

  const ui = $derived(tileVariants({ size, selected, revealed }))

  // Metro "tilt": the tile leans away from where you press it. Purely decorative
  // press feedback (uwp8 p. 108); CSS drops it under reduced motion. Attached
  // imperatively so the visual wrapper needs no interactive ARIA role.
  function tilt(node: HTMLDivElement) {
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
  class={ui.root()}
  style:--tile-bg={bgColor}
  style:--tile-fg={fg}
  {@attach tilt}
>
  {#if children}
    {@render children()}
  {:else if showLive}
    <MetroLiveFaces
      faces={tile.faces ?? []}
      period={tile.period}
      faviconPageUrl={tile.url}
      tint={fg}
      iconClass={ui.icon()}
    />
  {:else}
    <div class={`
      metro-tile-icon
      ${ui.icon()}
    `}
         aria-hidden='true'
    >
      <FaviconIcon
        pageUrl={tile.url ?? ''}
        tint={fg}
      />
    </div>
  {/if}
  {#if size !== 'small'}
    <div class={ui.label()}>
      {#if showDomain && domain}
        <span class={ui.domain()}>{` ${domain}`}</span>
      {/if}
      <span class={ui.title()}>{tile.title}</span>
    </div>
  {/if}
  {#if checked}
    <span class={ui.check()} aria-hidden='true'>
      <Icon name='check' size={size === 'small' ? 9 : 12} />
    </span>
  {/if}
  {#if tile.badge !== undefined}
    <span class={ui.badge()} aria-hidden='true'>{tile.badge}</span>
  {/if}
</div>

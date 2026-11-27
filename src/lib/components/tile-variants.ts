import { tv } from 'tailwind-variants'

/** Shared Metro tile chrome. Used by TileShell (root, check) and the concrete tiles for content slots. */
export const tileVariants = tv({
  slots: {
    root: `
      relative block size-full overflow-hidden font-sans text-(--tile-fg)
      no-underline transition-[transform,translate,opacity] duration-160
      ease-fluent
      before:pointer-events-none before:absolute before:inset-0 before:z-1
      before:border-2 before:border-transparent before:transition-[border-color]
      before:duration-160 before:ease-fluent before:content-['']
      after:pointer-events-none after:absolute after:inset-0 after:border-2
      after:border-transparent after:outline-1 after:-outline-offset-1
      after:outline-foreground/25 after:transition-[border-color]
      after:duration-160 after:ease-fluent after:content-['']
      after:outline-solid
      hover:before:border-foreground/70
      focus-visible:z-2 focus-visible:outline-3 focus-visible:outline-offset-3
      focus-visible:outline-(--primary)
      in-[.reduced]:before:transition-none
      in-[.reduced]:after:transition-none
      in-[.reduced]:active:transform-none
      data-selected:before:-inset-px
      data-selected:after:outline-transparent
      motion-reduce:transition-none
      motion-reduce:before:transition-none
      motion-reduce:after:transition-none
      motion-reduce:active:transform-none
    `,
    // Win8-style sheen: left edge brighter, right edge darker, hue preserved.
    background: `
      bg-[linear-gradient(to_left,color-mix(in_oklab,var(--tile-bg),white_5%),var(--tile-bg)_50%,color-mix(in_oklab,var(--tile-bg),black_11%))]
    `,
    icon: `absolute inset-0 flex items-center justify-center`,
    labelContainer: `absolute inset-x-0 bottom-0`,
    label: `mx-3.5 mb-1 flex flex-col text-left`,
    title: 'truncate text-xs/tight font-normal',
    domain: `truncate text-[10px]/tight font-normal opacity-70`,
    check: `
      absolute top-0 right-0 flex items-start justify-end bg-background pb-3
      pl-3 text-foreground [clip-path:polygon(100%_0,0_0,100%_100%)]
    `,
    badge: `
      absolute top-2.5 left-3 flex h-5.5 min-w-5.5 items-center justify-center
      rounded-xl bg-(--tile-fg) px-1.5 text-xs leading-none font-semibold
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
          after:pointer-events-none after:absolute after:inset-0 after:border-3
          after:border-background after:content-['']
        `,
      },
    },
    cutout: {
      true: {
        background: 'bg-transparent bg-none',
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
          translate-y-1.5
          active:transform-[perspective(600px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))_scale(.97)]
          in-[.reduced]:translate-none
          motion-reduce:translate-none
        `,
      },
    },
  },
  defaultVariants: {
    size: 'medium',
    selected: false,
    revealed: false,
    cutout: false,
  },
})

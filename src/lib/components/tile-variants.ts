import { tv } from 'tailwind-variants'

/** Shared Metro tile chrome. Used by MetroTile (bookmarks) and FolderTile. */
export const tileVariants = tv({
  slots: {
    root: `
      metro-tile relative block size-full border border-border/50 font-sans
      text-(--tile-fg) no-underline
      transition-[transform,scale,outline-color,box-shadow,opacity] duration-160
      ease-fluent
      hover:outline-2 hover:-outline-offset-2 hover:outline-(--tile-fg)/35
      focus-visible:z-2 focus-visible:outline-[3px]
      focus-visible:outline-offset-3 focus-visible:outline-(--primary)
      in-[.reduced]:active:transform-none
      motion-reduce:transition-none
      motion-reduce:active:transform-none
    `,
    background: `bg-(--tile-bg)`,
    icon: `absolute inset-0 flex items-center justify-center`,
    labelContainer: `absolute inset-x-0 bottom-0`,
    label: `mx-4 mb-1 flex flex-col text-left`,
    title: 'truncate text-xs/tight font-normal',
    domain: `truncate text-[10px]/tight font-normal`,
    check: `
      absolute top-0 right-0 flex items-start justify-end bg-(--tile-fg) pb-3
      pl-3 text-(--tile-bg) [clip-path:polygon(100%_0,0_0,100%_100%)]
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

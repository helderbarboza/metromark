<script lang='ts' module>
  import type { VariantProps } from 'tailwind-variants'
  import { cn } from '$lib/utils'
  import { tv } from 'tailwind-variants'

  export const buttonVariants = tv({
    base: `
      inline-flex h-[42px] shrink-0 items-center justify-center gap-[9px] rounded-[5px]
      border border-(--line) bg-(--surface) px-[17px] text-[12px] font-[550]
      whitespace-nowrap text-(--text) transition-[background] duration-140
      hover:bg-(--surface-hover)
      disabled:opacity-45
    `,
    variants: {
      variant: {
        primary: `
          primary border-(--accent) bg-(--accent) text-(--accent-ink)
          hover:bg-(--accent) hover:brightness-[1.06]
        `,
        danger: 'danger border-[#954541] bg-[#7c302f] text-white hover:bg-[#7c302f]',
      },
    },
  })

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
</script>

<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant
    children: Snippet
  }

  const {
    variant,
    children,
    class: className = '',
    type = 'button',
    ...rest
  }: Props = $props()
</script>

<button
  class={cn(buttonVariants({ variant }), className)}
  {type}
  {...rest}
  data-slot='button'
>
  {@render children()}
</button>

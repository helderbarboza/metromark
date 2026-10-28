<script lang='ts' module>
  import { cn } from '$lib/utils'
  import { tv } from 'tailwind-variants'

  export const iconButtonVariants = tv({
    base: `
      inline-flex size-[38px] items-center justify-center rounded-[6px] border
      border-transparent bg-transparent text-(--muted)
      hover:bg-(--surface-hover) hover:text-(--text)
    `,
  })
</script>

<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLButtonAttributes, 'aria-label'> {
    label: string
    children: Snippet
    class?: string
  }

  const {
    label,
    children,
    class: className = '',
    type = 'button',
    ...rest
  }: Props = $props()

  const classes = $derived(cn(iconButtonVariants(), className))
</script>

<button
  class={classes}
  aria-label={label}
  {type}
  {...rest}
  data-slot='button'
>
  {@render children()}
</button>

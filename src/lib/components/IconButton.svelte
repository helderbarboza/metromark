<script lang='ts' module>
  import { cn } from '$lib/utils'
  import { tv } from 'tailwind-variants'

  export const iconButtonVariants = tv({
    base: `
      inline-flex size-9.5 items-center justify-center rounded-md border
      border-transparent bg-transparent text-(--muted-foreground)
      hover:bg-(--accent) hover:text-(--foreground)
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

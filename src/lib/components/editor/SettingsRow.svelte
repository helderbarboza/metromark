<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    title: string
    helpText?: string
    controlId?: string
    disabled?: boolean
    children: Snippet
  }

  const {
    title,
    helpText,
    controlId,
    disabled = false,
    children,
    class: className = '',
    ...rest
  }: Props = $props()
</script>

<div
  class={cn(
    `
      flex min-h-14 items-center justify-between gap-4 border-t border-(--border) px-4
      py-3 text-(--foreground)
    `,
    disabled && 'text-(--muted-foreground)',
    className,
  )}
  aria-disabled={disabled || undefined}
  {...rest}
>
  <div class='min-w-0'>
    {#if controlId}
      <label for={controlId} id={`${controlId}-title`} class='block text-sm/5'>
        {title}
      </label>
    {:else}
      <div class='text-sm/5'>{title}</div>
    {/if}
    {#if helpText}
      <p
        id={controlId ? `${controlId}-help` : undefined}
        class='mt-0.5 text-xs/4 text-(--muted-foreground)'
      >
        {helpText}
      </p>
    {/if}
  </div>
  <div class='flex shrink-0 items-center gap-2.5'>
    {@render children()}
  </div>
</div>

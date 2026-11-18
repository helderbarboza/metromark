<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import { cn } from '$lib/utils.js'

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    icon: IconName
    title: string
    helpText?: string
    controlId: string
    children: Snippet
  }

  const {
    helpText,
    icon,
    title,
    controlId,
    children,
    class: className = '',
    ...rest
  }: Props = $props()
</script>

<div
  class={cn(
    `
      flex min-h-16 items-center justify-between gap-4 rounded-sm border border-(--border)
      bg-(--card) px-4 py-3
    `,
    className,
  )}
  {...rest}
>
  <div class='flex min-w-0 items-center gap-3.5 text-(--foreground)'>
    <Icon name={icon} size={20} />
    <div class='min-w-0'>
      <label for={controlId} id={`${controlId}-title`} class='block text-sm/5'>
        {title}
      </label>
      {#if helpText}
        <p id={`${controlId}-help`} class='mt-0.5 text-xs/4 text-(--muted-foreground)'>
          {helpText}
        </p>
      {/if}
    </div>
  </div>
  <div class='inline-flex shrink-0 items-center justify-end gap-2'>
    {@render children()}
  </div>
</div>

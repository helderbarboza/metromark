<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import * as Field from '$lib/components/ui/field'
  import { cn } from '$lib/utils.js'

  interface BaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    helpText?: string
    controlId?: string
    disabled?: boolean
    children: Snippet
  }

  type Props = BaseProps & (
    | { title: string, label?: never }
    | { label: string, title?: never }
  )

  const {
    title,
    label,
    helpText,
    controlId,
    disabled = false,
    children,
    class: className = '',
    ...rest
  }: Props = $props()
</script>

<Field.Field
  orientation='horizontal'
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
    {#if label}
      <Field.Label
        for={controlId}
        id={controlId
          ? `${controlId}-title`
          : undefined}
        class='block text-sm/5'
      >
        {label}
      </Field.Label>
    {:else if title}
      <Field.Title
        id={controlId
          ? `${controlId}-title`
          : undefined}
        class='block text-sm/5'
      >
        {title}
      </Field.Title>
    {/if}
    {#if helpText}
      <Field.Description
        id={controlId
          ? `${controlId}-help`
          : undefined}
        class='mt-0.5 text-xs/4 text-(--muted-foreground) last:mt-0.5'
      >
        {helpText}
      </Field.Description>
    {/if}
  </div>
  <div class='flex shrink-0 items-center gap-2.5'>
    {@render children()}
  </div>
</Field.Field>

<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import * as Field from '$lib/components/ui/field'
  import { cn } from '$lib/utils.js'

  interface BaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    icon: IconName
    helpText?: string
    controlId: string
    children: Snippet
  }

  type Props = BaseProps & (
    | { title: string, label?: never }
    | { label: string, title?: never }
  )

  const {
    helpText,
    icon,
    title,
    label,
    controlId,
    children,
    class: className = '',
    ...rest
  }: Props = $props()
</script>

<Field.Field
  orientation='horizontal'
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
      {#if label}
        <Field.Label for={controlId} id={`${controlId}-title`} class='block text-sm/5'>
          {label}
        </Field.Label>
      {:else if title}
        <Field.Title id={`${controlId}-title`} class='block text-sm/5'>
          {title}
        </Field.Title>
      {/if}
      {#if helpText}
        <Field.Description
          id={`${controlId}-help`}
          class='mt-0.5 text-xs/4 text-(--muted-foreground) last:mt-0.5'
        >
          {helpText}
        </Field.Description>
      {/if}
    </div>
  </div>
  <div class='inline-flex shrink-0 items-center justify-end gap-2'>
    {@render children()}
  </div>
</Field.Field>

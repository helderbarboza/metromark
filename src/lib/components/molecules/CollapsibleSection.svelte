<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'
  import Icon from '../atoms/Icon.svelte'

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    icon: IconName
    title: string
    helpText?: string
    value?: string
    open?: boolean
    control?: Snippet<[{ titleId: string }]>
    children: Snippet
  }

  let {
    icon,
    title,
    helpText,
    value,
    open = $bindable(false),
    control,
    children,
    class: className = '',
    ...rest
  }: Props = $props()

  const uid = $props.id()
  const titleId = `${uid}-title`
  const helpId = $derived(helpText ? `${uid}-help` : undefined)
  const contentId = `${uid}-content`

  function toggle() {
    open = !open
  }
</script>

<div
  class={cn('overflow-hidden rounded-sm border border-(--border) bg-(--card)', className)}
  {...rest}
>
  <div class='relative flex min-h-16 items-center gap-3 px-4 py-3'>
    <button
      type='button'
      class='
        absolute inset-0 z-0 rounded-sm
        focus-visible:outline-2 focus-visible:-outline-offset-2
        focus-visible:outline-(--ring)
      '
      aria-expanded={open}
      aria-controls={contentId}
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onclick={toggle}
    >
    </button>
    <div
      class='
        pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3.5
        text-(--foreground)
      '
    >
      <Icon name={icon} size={20} />
      <div class='min-w-0'>
        <div id={titleId} class='text-sm/5'>{title}</div>
        {#if helpText}
          <p id={helpId} class='mt-0.5 text-xs/4 text-(--muted-foreground)'>{helpText}</p>
        {/if}
      </div>
    </div>
    {#if control}
      <div class='pointer-events-auto relative z-10 shrink-0'>
        {@render control({ titleId })}
      </div>
    {:else if value}
      <span class='pointer-events-none relative z-10 shrink-0 text-sm text-(--foreground)'>
        {value}
      </span>
    {/if}
    <Icon
      name='chevronDown'
      class={cn(`
        pointer-events-none relative z-10 shrink-0 text-(--muted-foreground)
        transition-transform
        motion-reduce:transition-none
      `, { 'rotate-180': open })}
    />
  </div>
  <div id={contentId} class='border-t border-(--border) bg-(--card)' hidden={!open}>
    {@render children()}
  </div>
</div>

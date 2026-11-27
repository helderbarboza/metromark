<script lang='ts'>
  import { cn } from '$lib/utils.js'

  interface Props {
    value?: string
    id?: string
    disabled?: boolean
    ariaLabel?: string
    ariaDescribedBy?: string
    title?: string
    class?: string
    onValueChange?: (value: string) => void
  }

  let {
    value = $bindable('#000000'),
    id,
    disabled = false,
    ariaLabel,
    ariaDescribedBy,
    title,
    class: className = '',
    onValueChange,
  }: Props = $props()
</script>

<input
  {id}
  type='color'
  {disabled}
  bind:value
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedBy}
  {title}
  class={cn(`
    size-8 cursor-pointer rounded-xs border border-(--border) bg-transparent p-0.5
    disabled:cursor-not-allowed disabled:opacity-50
    [&::-webkit-color-swatch]:border-none
    [&::-webkit-color-swatch-wrapper]:size-full [&::-webkit-color-swatch-wrapper]:p-0
  `, className)}
  oninput={event => onValueChange?.(event.currentTarget.value)}
/>

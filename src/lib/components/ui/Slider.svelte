<script lang='ts'>
  import type { WithoutChildrenOrChild } from '$lib/utils.js'
  import { cn } from '$lib/utils.js'
  import { Slider as SliderPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    value = $bindable(),
    orientation = 'horizontal',
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props()
</script>
<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
  bind:ref
  // eslint-disable-next-line ts/consistent-type-assertions
  bind:value={value as never}
  data-slot='slider'
  {orientation}
  class={cn(`
    relative flex h-7 w-full touch-none items-center select-none
    data-disabled:opacity-50
  `, className)}
  {...restProps}
>
  {#snippet children({ thumbItems })}
    <span
      data-slot='slider-track'
      data-orientation={orientation}
      class={cn(`relative h-1.5 w-full grow overflow-hidden rounded-xs bg-(--line)`,
      )}
    >
      <SliderPrimitive.Range
        data-slot='slider-range'
        class={cn(`absolute h-full bg-(--accent)`,
        )}
      />
    </span>
    {#each thumbItems as thumb (thumb.index)}
      <SliderPrimitive.Thumb
        data-slot='slider-thumb'
        index={thumb.index}
        class={cn(`
          relative z-10 block size-4 cursor-grab rounded-xs border-2 border-(--accent)
          bg-(--surface) shadow-sm transition-transform duration-150
          before:absolute before:-inset-3 before:content-[""]
          hover:scale-110
          focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-(--accent)
          data-active:scale-110
          data-disabled:cursor-not-allowed
          motion-reduce:transition-none
        `)}
      />
    {/each}
  {/snippet}
</SliderPrimitive.Root>

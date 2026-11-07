<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { HTMLAttributes } from 'svelte/elements'
  import { getIcon } from '$lib/icons'
  import Iconify from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { cn } from 'cn'

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    name: IconName
    size?: number
  }

  const { name, size = 20, class: className }: Props = $props()
</script>

<Iconify
  icon={getIcon(name)}
  width={size}
  height={size}
  aria-hidden='true'
  class={cn('inline-flex size-5 shrink-0 items-center justify-center', className)}
/>

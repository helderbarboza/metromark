<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { ComponentProps } from 'svelte'
  import { getIcon } from '$lib/icons'
  import { cn } from '$lib/utils.js'
  import Iconify from '@iconify/svelte/dist/OfflineIcon.svelte'

  interface Props extends Omit<ComponentProps<Iconify>, 'icon'> {
    name: IconName
    size?: number
  }

  const { name, size = 20, class: className, ...rest }: Props = $props()
</script>

<Iconify
  icon={getIcon(name)}
  width={size}
  height={size}
  aria-hidden='true'
  class={cn('inline-flex size-5 shrink-0 items-center justify-center', className)}
  {...rest}
/>

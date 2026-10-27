<script lang='ts'>
  import type { IconName } from '../icons'
  import Iconify from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { getIcon } from '../icons'

  interface Props {
    name: IconName
    size?: number
  }

  const { name, size = 18 }: Props = $props()
</script>

<span
  class='inline-flex size-5 shrink-0 items-center justify-center'
  aria-hidden='true'
  style:width='{size}px'
  style:height='{size}px'
>
  <Iconify
    icon={getIcon(name)}
    width={size}
    height={size}
  />
</span>

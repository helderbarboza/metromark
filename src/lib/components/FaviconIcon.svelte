<script lang='ts'>
  import type { HTMLImgAttributes } from 'svelte/elements'
  import { loadConvertedFavicon } from '$lib/favicon-cache'
  import { icons } from '$lib/icons'
  import { motionDuration } from '$lib/reduced-motion'
  import OfflineIcon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { fade } from 'svelte/transition'
  import { cn } from 'tailwind-variants'
  // Tile icon: the browser's local favicon cache, converted to a Metro-tint
  // silhouette, with the bundled globe while converting and whenever the page
  // has no cached favicon or conversion fails. Custom icon choices bypass this
  // component entirely.
  // The branches stack in one grid cell so the outroing branch and the
  // incoming branch overlap during the fade instead of laying out side-by-side.

  interface Props extends HTMLImgAttributes {
    pageUrl: string
    tint?: string
  }

  const {
    pageUrl,
    tint = '#ffffff',
    class: className = '',
    ...rest
  }: Props = $props()
</script>

<div class='grid'>
  {#await loadConvertedFavicon(pageUrl, tint)}
    <div
      out:fade={{ duration: motionDuration(150) }}
      class={cn('col-start-1 row-start-1 animate-pulse rounded-full bg-current', className)}
    ></div>
  {:then dataUrl}
    <img
      transition:fade={{ duration: motionDuration(150) }}
      src={dataUrl}
      alt=""
      decoding='async'
      aria-hidden='true'
      draggable='false'
      class={cn('col-start-1 row-start-1 [image-rendering:auto]', className)}
      {...rest}
    />
  {:catch}
    <span
      transition:fade={{ duration: motionDuration(150) }}
      class={cn('col-start-1 row-start-1 inline-flex', className)}
    >
      <OfflineIcon icon={icons.globe} aria-hidden='true' class={className} />
    </span>
  {/await}
</div>

<script lang='ts'>
  import type { HTMLImgAttributes } from 'svelte/elements'
  import { icons } from '$lib/icons'
  import OfflineIcon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { cn } from 'tailwind-variants'
  // Tile icon: the browser's local favicon cache, resolved by the
  // `FaviconImage` container. By default it is converted to a Metro-tint
  // silhouette; with the "Original favicons" setting it keeps the site's
  // full colors. The bundled globe shows while loading and whenever the
  // page has no cached favicon or conversion fails. Custom icon choices
  // bypass this component entirely.
  // The branches stack in one grid cell so the outroing branch and the
  // incoming branch overlap during the fade instead of laying out side-by-side.

  interface Props extends HTMLImgAttributes {
    status: 'pending' | 'ready' | 'failed'
    /** Data URL of the resolved icon. Read only when `status` is 'ready'. */
    src?: string
  }

  const {
    status,
    src,
    class: className = '',
    ...rest
  }: Props = $props()
</script>

<div class='grid'>
  {#if status === 'pending'}
    <div class={cn('col-start-1 row-start-1 animate-pulse rounded-full bg-current opacity-20', className)}></div>
  {:else if status === 'ready' && src}
    <img
      {src}
      alt=""
      decoding='async'
      aria-hidden='true'
      draggable='false'
      class={cn('col-start-1 row-start-1 [image-rendering:auto]', className)}
      {...rest}
    />
  {:else}
    <span class={cn('col-start-1 row-start-1 inline-flex', className)}>
      <OfflineIcon icon={icons.globe} aria-hidden='true' class={className} />
    </span>
  {/if}
</div>

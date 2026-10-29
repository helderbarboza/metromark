<script lang='ts'>
  import type { HTMLImgAttributes } from 'svelte/elements'
  import { loadConvertedFavicon } from '$lib/favicon-cache'
  import { icons } from '$lib/icons'
  import OfflineIcon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { cn } from 'tailwind-variants'
  // Tile icon: the browser's local favicon cache, converted to a Metro-tint
  // silhouette, with the bundled globe while converting and whenever the page
  // has no cached favicon or conversion fails. Custom icon choices bypass this
  // component entirely.

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

{#await loadConvertedFavicon(pageUrl, tint)}
  <OfflineIcon icon={icons.globe} aria-hidden='true' class={className} />
{:then dataUrl}
  <img
    src={dataUrl}
    alt=""
    aria-hidden='true'
    draggable='false'
    decoding='async'
    class={cn('[image-rendering:auto]', className)}
    {...rest}
  />
{:catch}
  <OfflineIcon icon={icons.globe} aria-hidden='true' class={className} />
{/await}

<script lang='ts'>
  import OfflineIcon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { loadConvertedFavicon } from '../favicon-cache'
  import { icons } from '../icons'
  // Tile icon: the browser's local favicon cache, converted to a Metro-tint
  // silhouette, with the bundled globe while converting and whenever the page
  // has no cached favicon or conversion fails. Custom icon choices bypass this
  // component entirely.

  interface Props {
    pageUrl: string
    tint?: string
  }

  const {
    pageUrl,
    tint = '#ffffff',
  }: Props = $props()
</script>

{#await loadConvertedFavicon(pageUrl, tint)}
  <OfflineIcon icon={icons.globe} aria-hidden='true' />
{:then dataUrl}
  <img
    src={dataUrl}
    alt=""
    aria-hidden='true'
    draggable='false'
    decoding='async'
  />
{:catch}
  <OfflineIcon icon={icons.globe} aria-hidden='true' />
{/await}

<style>
  img {
    image-rendering: -webkit-optimize-contrast;
  }
</style>

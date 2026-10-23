<script lang='ts'>
  import { loadConvertedFavicon } from '../favicon-cache'
  // Tile icon: the browser's local favicon cache, converted to a Metro-tint
  // silhouette, with the bundled SVG (`fallback`) while converting and
  // whenever the page has no cached favicon or conversion fails. Custom icon
  // choices bypass this component entirely.

  interface Props {
    pageUrl: string
    tint?: string
    fallback?: string
  }

  const {
    pageUrl,
    tint = '#ffffff',
    fallback = '',
  }: Props = $props()
</script>

{#await loadConvertedFavicon(pageUrl, tint)}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html fallback}
{:then dataUrl}
  <img
    src={dataUrl}
    alt=""
    aria-hidden='true'
    draggable='false'
    decoding='async'
  />
{/await}

<style>
  img {
    image-rendering: -webkit-optimize-contrast;
  }
</style>

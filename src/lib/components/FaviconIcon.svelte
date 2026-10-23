<script lang='ts'>
  import { loadConvertedFavicon } from '../favicon-cache'
  import { globeIcon } from '../icons'
  // Tile icon: the browser's local favicon cache, converted to a Metro-tint
  // silhouette, with the bundled globe SVG while converting and whenever the
  // page has no cached favicon or conversion fails. Custom icon choices bypass
  // this component entirely.

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
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html globeIcon}
{:then dataUrl}
  <img
    src={dataUrl}
    alt=""
    aria-hidden='true'
    draggable='false'
    decoding='async'
  />
{:catch}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html globeIcon}
{/await}

<style>
  img {
    image-rendering: -webkit-optimize-contrast;
  }
</style>

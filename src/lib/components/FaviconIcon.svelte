<script lang='ts'>
  import { loadConvertedFavicon } from '../favicon-cache'
  // Tile icon: the browser's local favicon cache, converted to a Metro-tint
  // silhouette, with the bundled SVG (`fallback`) while converting and
  // whenever the page has no cached favicon or conversion fails. Custom icon
  // choices bypass this component entirely.

  interface Props {
    pageUrl: string
    tint?: string
    requestSize?: number
    convertSize?: number
    scaleFactor?: 1 | 2
    fallback?: string
  }

  const { pageUrl, tint = '#ffffff', requestSize = 64, convertSize = 64, scaleFactor = 1, fallback = '' }: Props = $props()

  let converted = $state<string | null>(null)
  let failed = $state(false)

  $effect(() => {
    const url = pageUrl
    const ink = tint
    const requested = requestSize
    const target = convertSize
    const scale = scaleFactor
    let cancelled = false
    converted = null
    failed = false
    if (!url.trim()) {
      failed = true
      return
    }
    loadConvertedFavicon(url, ink, requested, target, scale).then(
      (dataUrl) => {
        if (!cancelled)
          converted = dataUrl
      },
      () => {
        if (!cancelled)
          failed = true
      },
    )
    return () => {
      cancelled = true
    }
  })
</script>

{#if converted && !failed}
  <img
    src={converted}
    alt=""
    aria-hidden='true'
    draggable='false'
    decoding='async'
  />
{:else}
  <!-- Safe: fallback is always our bundled SVG registry string, never bookmark data. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html fallback}
{/if}

<style>
  img {
    image-rendering: -webkit-optimize-contrast;
  }
</style>

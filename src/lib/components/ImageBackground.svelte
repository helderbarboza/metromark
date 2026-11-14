<script lang='ts'>
  // Decorative image layer for the new-tab background. Mirrors ShaderBackground.svelte:
  // absolutely positioned, behind the page, hidden from the accessibility tree.
  // Sources: http(s) URLs, legacy data: URIs, and `idb:` references into the
  // IndexedDB media store (resolved once per mount to an object URL).
  // An image that fails to load hides itself and reports through `onerror`;
  // the base color layer stays visible.

  import type { ImageBackgroundSettings } from '$lib/config'
  import { isMediaKey } from '$lib/background-image'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { loadBackgroundMedia } from '$lib/media-store'
  import { untrack } from 'svelte'

  interface Props {
    /**
     * Source: http(s) URL, legacy data:image URI, or an `idb:<uuid>` media key.
     * Empty renders only the base color.
     */
    src?: string
    /** Base color under the image layer */
    color?: string
    /** How the image fills the canvas */
    fit?: 'cover' | 'contain' | 'fill' | 'none'
    /** Layer opacity over the base color */
    opacity?: number
    /** 0..1 progress through the horizontal scroll; drives the subtle parallax */
    scrollProgress?: number
    /** Enable the scroll parallax. Forced off by reduced motion. */
    parallax?: boolean
    /** Layer scale as a percentage of the canvas size; bigger means wider layer and more travel */
    parallaxZoom?: ImageBackgroundSettings['parallaxZoom']
    reducedMotion?: boolean
    /** Called when the image fails to load. The layer hides itself. */
    onerror?: () => void
  }

  const {
    src = '',
    color,
    fit = 'cover',
    opacity = 1,
    scrollProgress = 0,
    parallax = false,
    parallaxZoom = BACKGROUND_DEFAULTS.image.parallaxZoom,
    reducedMotion = false,
    onerror,
  }: Props = $props()

  let failed = $state(false)
  /** Object URL for an `idb:` source, or null while it resolves / for other sources. */
  let mediaUrl = $state<string | null>(null)
  /**
   * Value-stable view of `src`. The parent passes a getter that reads the whole
   * snapshot object, so effects that read `src` subscribe to unrelated settings
   * commits. `$derived` compares by value, so consumers re-run only on a real
   * source change.
   */
  const srcKey = $derived(src)
  // A new source resets the failure state: switching to a working image
  // after a broken one must show again.
  let lastSrc = untrack(() => srcKey)
  $effect(() => {
    if (srcKey !== lastSrc) {
      lastSrc = srcKey
      failed = false
    }
  })

  // Resolve IndexedDB-backed media to an object URL; revoke it on change/unmount.
  $effect(() => {
    const current = srcKey
    if (!isMediaKey(current)) {
      mediaUrl = null
      return
    }
    let revoked = false
    let objectUrl: string | null = null
    loadBackgroundMedia(current)
      .then((blob) => {
        if (revoked)
          return
        if (!blob) {
          failed = true
          onerror?.()
          return
        }
        objectUrl = URL.createObjectURL(blob)
        mediaUrl = objectUrl
      })
      .catch(() => {
        if (revoked)
          return
        failed = true
        onerror?.()
      })
    return () => {
      revoked = true
      if (objectUrl)
        URL.revokeObjectURL(objectUrl)
      mediaUrl = null
    }
  })

  /** The URL the <img> actually loads: object URL for media keys, else the source itself. */
  const displaySrc = $derived(isMediaKey(src) ? mediaUrl : (src || null))

  // object-fit values match the schema one-to-one; `fill` stretches.
  const objectFit = $derived(fit)
  const parallaxActive = $derived(parallax && !reducedMotion && src !== '' && !failed)
  /**
   * Unitless layer scale, exposed to the layer as `--parallax-zoom`. The layer
   * is sized in percent of the container, so the parallax stays proportional
   * at any size and needs no measurement.
   */
  const zoom = $derived(parallaxZoom)
  /**
   * Offset as a percentage of the layer's own width: `translateX` percentages
   * resolve against the layer itself. (0.5 - p) keeps the direction picked for
   * the inverted mapping: rest is shifted positive, full scroll negative.
   */
  const shift = $derived((0.5 - scrollProgress) * ((zoom - 1) / zoom) * 100)
</script>

<div
  class='pointer-events-none absolute inset-0 -z-1'
  style:background={color}
  style:--parallax-zoom={zoom}
  aria-hidden='true'
>
  {#if displaySrc && !failed}
    <img
      src={displaySrc}
      alt=''
      aria-hidden='true'
      draggable='false'
      referrerpolicy='no-referrer'
      fetchpriority='high'
      decoding='sync'
      class={[
        'absolute inset-y-0 object-center',
        parallaxActive
          ? `
            left-[calc((1-var(--parallax-zoom))*50%)] h-full
            w-[calc(var(--parallax-zoom)*100%)] max-w-none will-change-transform
          `
          : 'inset-x-0 size-full',
      ]}
      style:object-fit={objectFit}
      style:opacity={opacity}
      style:transform={parallaxActive ? `translate3d(${shift}%, 0, 0)` : undefined}
      onerror={() => {
        failed = true
        onerror?.()
      }}
    />
  {/if}
</div>

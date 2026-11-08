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

  /**
   * Icon resolves imperatively in an effect instead of `{#await}`. The await
   * block re-runs its input effect on every settings commit, which tore the
   * rendered branch down and rebuilt the icon for every tile. This effect
   * reads the raw props directly, so it re-runs with the parent too, but it
   * bails out when the key is unchanged — no promise lookups, no state writes.
   */
  type IconState
    = | { status: 'pending' }
      | { status: 'ready', dataUrl: string }
      | { status: 'failed' }

  const keyOf = (url: string, shade: string) => `${url} ${shade}`
  let state = $state<IconState>({ status: 'pending' })
  // Plain book-keeping, not reactive state: only the `state` signal drives the
  // template, and re-assigning it with the identical string is inert. null
  // forces the initial load on mount.
  let currentKey: string | null = null

  $effect(() => {
    const key = keyOf(pageUrl, tint)
    if (key === currentKey)
      return
    currentKey = key
    state = { status: 'pending' }
    let stale = false
    loadConvertedFavicon(pageUrl, tint).then(
      (dataUrl) => {
        if (!stale)
          state = { status: 'ready', dataUrl }
      },
      () => {
        if (!stale)
          state = { status: 'failed' }
      },
    )
    return () => {
      stale = true
    }
  })
</script>

<div class='grid'>
  {#if state.status === 'pending'}
    <div class={cn('col-start-1 row-start-1 animate-pulse rounded-full bg-current opacity-20', className)}></div>
  {:else if state.status === 'ready'}
    <img
      src={state.dataUrl}
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

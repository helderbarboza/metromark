<script lang='ts'>
  import FaviconIcon from '$lib/components/atoms/FaviconIcon.svelte'
  import { SETTINGS_DEFAULTS } from '$lib/config'
  import { loadConvertedFavicon, loadFavicon } from '$lib/favicon-cache'
  import { isFaviconEligible } from '$lib/icon-sources'
  import { getWorkspace, hasWorkspace } from '$lib/workspace-context'
  // Container for the tile favicon: resolves the browser's favicon cache
  // (a Metro-tint silhouette by default, the site's full colors with the
  // "Original favicons" setting) and passes the result down to the
  // presentational `FaviconIcon` atom. In the web preview the browser has no
  // favicon cache, so seeded demo sites render their bundled favicon in full
  // color instead; the installed extension keeps using the browser's own
  // favicon cache and never loads the bundled icons.

  interface Props {
    pageUrl: string
    tint: string
    class?: string
  }

  const {
    pageUrl,
    tint,
    class: className = '',
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

  // "Original favicons" comes from the workspace context so deep tile
  // components need no prop drilling. Stories without a provider get the
  // monochrome default.
  const readWorkspace = hasWorkspace()
    ? getWorkspace()
    : undefined
  const originalFavicons = $derived(
    readWorkspace?.().originalFavicons ?? SETTINGS_DEFAULTS.originalFavicons,
  )

  const keyOf = (url: string, shade: string, original: boolean) =>
    `${url} ${original ? 'original' : shade}`
  let state = $state<IconState>({ status: 'pending' })
  // Plain book-keeping, not reactive state: only the `state` signal drives the
  // template, and re-assigning it with the identical string is inert. null
  // forces the initial load on mount.
  let currentKey: string | null = null

  $effect(() => {
    const original = originalFavicons
    const key = keyOf(pageUrl, tint, original)
    if (key === currentKey)
      return
    currentKey = key
    state = { status: 'pending' }
    let stale = false
    const task = async () => {
      // Web preview only: the build-time flag removes this branch, the dynamic
      // import and the bundled favicons from the extension bundles.
      if (import.meta.env.METROMARK_PREVIEW) {
        try {
          const { demoFaviconFor } = await import('$lib/demo-favicons')
          const demo = demoFaviconFor(pageUrl)
          if (demo !== undefined)
            return demo
        }
        catch (error) {
          console.warn('Bundled demo favicon lookup failed; using the default fallback.', error)
        }
        // Host not in the bundle: resolve it live so edited demo bookmarks
        // get their icon without re-running the favicon generator. The
        // s2 endpoint always serves an image; Google sees only the host.
        if (isFaviconEligible(pageUrl)) {
          try {
            const host = new URL(pageUrl.trim()).hostname
            return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
          }
          catch {
          // Fall through to the default fallback.
          }
        }
      }
      return original
        ? loadFavicon(pageUrl)
        : loadConvertedFavicon(pageUrl, tint)
    }
    task().then(
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

<FaviconIcon
  status={state.status}
  src={state.status === 'ready'
    ? state.dataUrl
    : undefined}
  class={className}
/>

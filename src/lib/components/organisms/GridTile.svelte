<script module lang='ts'>
  import type { Attachment } from 'svelte/attachments'
  import { SvelteMap } from 'svelte/reactivity'

  const observers = new SvelteMap<string, IntersectionObserver>()

  function getObserver(rootMargin: string) {
    let io = observers.get(rootMargin)
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          for (const { target, isIntersecting } of entries) {
            target.toggleAttribute('data-offscreen', !isIntersecting)
          }
        },
        { rootMargin },
      )
      observers.set(rootMargin, io)
    }
    return io
  }

  function pauseOffscreen(rootMargin = '100px'): Attachment<HTMLElement> {
    return (element) => {
      const io = getObserver(rootMargin)
      io.observe(element)

      return () => {
        io.unobserve(element)
        element.removeAttribute('data-offscreen')
      }
    }
  }
</script>

<script lang='ts'>

  import type { Gesture } from '$lib/interaction'
  import type { LayoutItem, TileSize, TileView } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import BookmarkTile from '$lib/components/organisms/BookmarkTile.svelte'
  import FolderTile from '$lib/components/organisms/FolderTile.svelte'
  import { SETTINGS_DEFAULTS } from '$lib/config'
  import { advanceGesture, releaseOutcome, startGesture } from '$lib/interaction'
  import { inspectLaunchUrl } from '$lib/launch-url'
  import { layoutItemStyle, sizeOf } from '$lib/layout'
  import { cn } from '$lib/utils.js'
  import { getWorkspace, hasWorkspace } from '$lib/workspace-context'
  import { createGridItem } from '@snapgridjs/svelte'

  interface Props {
    id: string
    group: string
    /** Committed layout entry, used before Snapgrid republishes a moved tile. */
    entry: LayoutItem
    /** Tile-grid cell size in px. Sets the fallback pixel geometry. */
    cell: number
    tile: TileView
    showDomains: boolean
    preview: boolean
    onselect: (id: string, event: PointerEvent) => void
    /** Called when a bookmark address is unsafe to open. The URL stays in the tree. */
    onblocked?: (url: string) => void
    /** Folder tiles activate by scrolling to their group instead of launching. */
    onactivate?: (id: string) => void
    /** Omit to hide the quick grow/shrink button (read-only tiles). */
    onresize?: (size: TileSize) => void
  }

  const {
    id,
    group,
    entry,
    cell,
    tile,
    showDomains,
    preview,
    onselect,
    onblocked,
    onactivate,
    onresize,
  }: Props = $props()
  // Snapgrid instances are keyed by immutable browser bookmark IDs.
  // svelte-ignore state_referenced_locally
  const item = createGridItem({ id, group })
  // The projected size stays valid while Snapgrid has no item for a moved tile.
  const size = $derived(item.item
    ? sizeOf(item.item)
    : tile.size)
  // Snapgrid returns a style without width/height until it knows the item.
  // Keep the tile at its exact cell for that frame instead of letting
  // size-full stretch it across the destination board.
  const style = $derived(item.item
    ? item.style
    : `position: absolute; touch-action: none; ${layoutItemStyle(entry, cell)}`)
  // Workspace state flows through context (set by the root component); without a
  // provider (e.g. in stories), consumers get inert defaults.
  const readWorkspace = hasWorkspace()
    ? getWorkspace()
    : undefined
  const dragging = $derived(readWorkspace?.().dragging ?? false)
  const selected = $derived((readWorkspace?.().selectedId ?? null) === id)
  const reducedMotion = $derived(readWorkspace?.().reducedMotion ?? SETTINGS_DEFAULTS.reducedMotion)
  // Cross-slide runs on touch and pen only; a mouse selects with the right button
  // and moves tiles with a plain drag.
  let gesture = $state<Gesture | null>(null)
  let swallowClick = false
  const revealed = $derived(!dragging && gesture?.state === 'armed')
  const folderTile = $derived(tile.kind === 'folder'
    ? tile
    : undefined)
  const bookmarkTile = $derived(tile.kind === 'bookmark'
    ? tile
    : undefined)
  const launch = $derived(bookmarkTile
    ? inspectLaunchUrl(bookmarkTile.url)
    : undefined)
  const href = $derived(launch?.ok ? launch.url : undefined)
  const bookmarkLabel = $derived(bookmarkTile
    ? $LL.app.openBookmark({
      name: showDomains && bookmarkTile.size !== 'small'
        ? `${bookmarkTile.title} ${bookmarkTile.domain}`
        : bookmarkTile.title,
    })
    : '')

  function pointerdown(event: PointerEvent) {
    swallowClick = false
    if (event.button !== 0 || dragging || event.pointerType === 'mouse')
      return
    gesture = startGesture({ x: event.clientX, y: event.clientY })
  }
  function pointermove(event: PointerEvent) {
    if (!gesture)
      return
    const next = advanceGesture(gesture, {
      x: event.clientX,
      y: event.clientY,
    })
    if (next !== gesture)
      gesture = next
  }
  function pointerup(event: PointerEvent) {
    if (!gesture)
      return
    const outcome = releaseOutcome(
      advanceGesture(gesture, { x: event.clientX, y: event.clientY }),
    )
    gesture = null
    // A tap still launches the bookmark; selecting or moving it must not.
    if (outcome === 'open')
      return
    swallowClick = true
    if (outcome === 'select')
      onselect(id, event)
  }
  function click(event: MouseEvent) {
    // A release that selected the tile, or ended a move, must not activate it.
    if (swallowClick || dragging) {
      swallowClick = false
      event.preventDefault()
      return
    }
    if (bookmarkTile && launch && !launch.ok) {
      event.preventDefault()
      onblocked?.(bookmarkTile.url)
      return
    }
    if (folderTile) {
      // Folder tiles never launch; they scroll to the folder's group.
      event.preventDefault()
      onactivate?.(id)
    }
  }
  /**
   * The grid's keyboard sensor claims Enter to pick a tile up, so Enter has to be
   * claimed first. A capture listener on the document is the only place guaranteed
   * to run before the sensor's listener on the tile itself; Space stays with the
   * sensor so a keyboard move is still possible.
   */
  function keyGuard(node: HTMLElement) {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.target !== node || item.isDragging)
        return
      event.preventDefault()
      event.stopImmediatePropagation()
      node.click()
    }
    document.addEventListener('keydown', keydown, true)
    return () => document.removeEventListener('keydown', keydown, true)
  }
  const attachTile = (node: HTMLElement) => {
    const cleanupDrag = item.attach(node)
    const cleanupKeys = keyGuard(node)
    return () => {
      cleanupDrag?.()
      cleanupKeys?.()
    }
  }

</script>

{#if folderTile}
  <FolderTile
    {@attach pauseOffscreen()}
    tile={folderTile}
    size={size}
    {selected}
    {revealed}
    ariaLabel={$LL.app.folderTileLabel({ title: tile.title })}
    ariaRoleDescription={$LL.app.draggableFolder()}
    draggable={false}
    class={cn(
      `
        snapgrid-item block cursor-default
        data-offscreen:paused
        data-[dragging=true]:z-10 data-[dragging=true]:cursor-grabbing
      `,
      dragging && !item.isDragging && !reducedMotion && 'animate-float [&>button]:scale-93',
      dragging && !item.isDragging && '[&>button]:opacity-85',
      dragging && item.isDragging && !reducedMotion && '[&>button]:scale-104',
      dragging && item.isDragging && '[&>button]:opacity-95',
      dragging && item.isDragging && '[&>button]:shadow-[0_10px_30px_color-mix(in_srgb,black_47%,transparent)]',
    )}
    style={style}
    dataTestId='folder-tile'
    dataGridId={id}
    dataDragging={item.isDragging}
    attach={attachTile}
    {onresize}
    onclick={click}
    onpointerdown={pointerdown}
    onpointermove={pointermove}
    onpointerup={pointerup}
    onpointercancel={() => (gesture = null)}
  />
{:else if bookmarkTile}
  <BookmarkTile
    {@attach pauseOffscreen()}
    tile={bookmarkTile}
    size={size}
    {selected}
    {revealed}
    domain={bookmarkTile.domain}
    showDomain={showDomains}
    as={launch?.ok ? 'a' : 'button'}
    href={href}
    target={preview ? '_blank' : undefined}
    ariaLabel={bookmarkLabel}
    ariaRoleDescription={$LL.app.draggableBookmark()}
    draggable={false}
    class={cn(
      `
        snapgrid-item block cursor-default
        data-offscreen:paused
        data-[dragging=true]:z-10 data-[dragging=true]:cursor-grabbing
      `,
      // During a drag, sibling tiles shrink and dim while the dragged tile lifts.
    // Tailwind v4 `scale-*` uses the CSS `scale` property, so it composes with the
    // transform FLIP that snapgrid animates. The dragged tile is the anchor (it is
    // position:fixed and floats with the pointer); its outer grid-item wrapper
    // stays behind at the origin, so the lift styles go on the anchor, not the
    // wrapper. dnd-kit also clones the anchor as an invisible inert ghost
    // (data-dnd-placeholder="hidden"), which needs no exclusion handling.
      dragging && !item.isDragging && !reducedMotion && `animate-float
        [&>a]:scale-93 [&>button]:scale-93`,
      dragging && !item.isDragging && '[&>a]:opacity-85 [&>button]:opacity-85',
      dragging && item.isDragging && !reducedMotion && '[&>a]:scale-104 [&>button]:scale-104',
      dragging && item.isDragging && '[&>a]:opacity-95 [&>button]:opacity-95',
      dragging && item.isDragging && `
        [&>a]:shadow-[0_10px_30px_color-mix(in_srgb,black_47%,transparent)]
        [&>button]:shadow-[0_10px_30px_color-mix(in_srgb,black_47%,transparent)]
      `,
    )}
    style={style}
    dataTestId='bookmark-tile'
    dataGridId={id}
    dataDragging={item.isDragging}
    attach={attachTile}
    {onresize}
    onclick={click}
    onpointerdown={pointerdown}
    onpointermove={pointermove}
    onpointerup={pointerup}
    onpointercancel={() => (gesture = null)}
  />
{/if}

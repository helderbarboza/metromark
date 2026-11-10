<script lang='ts'>
  import type { Gesture } from '$lib/interaction'
  import type { TileSize, TileView } from '$lib/types'
  import MetroTile from '$lib/components/MetroTile.svelte'
  import { advanceGesture, releaseOutcome, startGesture } from '$lib/interaction'
  import { sizeOf } from '$lib/layout'
  import { safeUrl, validateUrl } from '$lib/url'
  import { createGridItem } from '@snapgridjs/svelte'

  interface Props {
    id: string
    group: string
    tile: TileView
    selected: boolean
    showDomains: boolean
    preview: boolean
    dragging: boolean
    onselect: (id: string, event: PointerEvent) => void
    onblocked: (message: string) => void
    /** Omit to hide the quick grow/shrink button (read-only tiles). */
    onresize?: (size: TileSize) => void
  }

  const {
    id,
    group,
    tile,
    selected,
    showDomains,
    preview,
    dragging,
    onselect,
    onblocked,
    onresize,
  }: Props = $props()
  // Snapgrid instances are keyed by immutable browser bookmark IDs.
  // svelte-ignore state_referenced_locally
  const item = createGridItem({ id, group })
  // Cross-slide runs on touch and pen only; a mouse selects with the right button
  // (uwp8 pp. 79, 158) and moves tiles with a plain drag.
  let gesture = $state<Gesture | null>(null)
  let swallowClick = false
  const revealed = $derived(!dragging && gesture?.state === 'armed')
  // Unsupported addresses stay in the tree but must never be launched (see validateUrl).
  const href = $derived(safeUrl(tile.url))

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
    // A release that selected the tile, or ended a move, must not launch it.
    if (swallowClick || dragging) {
      swallowClick = false
      event.preventDefault()
      return
    }
    launch(event)
  }
  function launch(event: MouseEvent) {
    try {
      validateUrl(tile.url)
    }
    catch (error) {
      event.preventDefault()
      onblocked(
        error instanceof Error
          ? error.message
          : 'Unable to open this bookmark.',
      )
    }
  }
  /**
   * The grid's keyboard sensor claims Enter to pick a tile up, so Enter has to be
   * claimed first. A capture listener on the document is the only place guaranteed
   * to run before the sensor's listener on the tile itself; Space stays with the
   * sensor so a keyboard move is still possible.
   */
  function keyGuard(node: HTMLAnchorElement) {
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
  const attachTile = (node: HTMLAnchorElement) => {
    const cleanupDrag = item.attach(node)
    const cleanupKeys = keyGuard(node)
    return () => {
      cleanupDrag?.()
      cleanupKeys?.()
    }
  }
</script>

<MetroTile
  {tile}
  size={item.item ? sizeOf(item.item) : tile.size}
  {selected}
  {revealed}
  domain={tile.domain}
  showDomain={showDomains}
  href={href}
  target={preview ? '_blank' : undefined}
  ariaLabel="Open {tile.title}{showDomains && tile.size !== 'small'
    ? ` ${tile.domain}`
    : ''}. Right-click to select. Space to pick up and move; arrow keys to move; Escape to cancel."
  ariaRoleDescription='draggable bookmark'
  draggable={false}
  class={`
    snapgrid-item block cursor-default
    data-[dragging=true]:z-10 data-[dragging=true]:cursor-grabbing
  `}
  style={item.style}
  dataTestId='metro-tile'
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

<script lang='ts'>
  import type { Gesture } from '../interaction'
  import type { TileView } from '../types'
  import { createGridItem } from '@snapgridjs/svelte'
  import { advanceGesture, releaseOutcome, startGesture } from '../interaction'
  import { sizeOf } from '../layout'
  import { safeUrl, validateUrl } from '../url'
  import MetroTile from './MetroTile.svelte'

  interface Props {
    id: string
    group: string
    tile: TileView
    selected: boolean
    showDomains: boolean
    preview: boolean
    dragging: boolean
    onselect: (id: string, event: PointerEvent) => void
    oncontextmenu: (event: MouseEvent) => void
    onblocked: (message: string) => void
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
    oncontextmenu,
    onblocked,
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
</script>

<a
{@attach keyGuard}
  {@attach item.attach}
  style={item.style}
  class='grid-tile snapgrid-item'
  draggable='false'
  data-grid-id={id}
  data-dragging={item.isDragging || undefined}
  {href}
  target={preview ? '_blank' : undefined}
  rel='noopener noreferrer'
  title='{tile.title} — {tile.url}'
  aria-label="Open {tile.title}{showDomains && tile.size !== 'small'
    ? ` ${tile.domain}`
    : ''}. Right-click to select. Space to pick up and move; arrow keys to move; Escape to cancel."
  aria-roledescription='draggable bookmark'
  onpointerdown={pointerdown}
  onpointermove={pointermove}
  onpointerup={pointerup}
  onpointercancel={() => (gesture = null)}
  onclick={click}
  {oncontextmenu}
>
  <MetroTile
    {tile}
    size={item.item ? sizeOf(item.item) : tile.size}
    {selected}
    {revealed}
    domain={tile.domain}
    showDomain={showDomains}
  />
</a>

<style>
  .grid-tile {
    display: block;
    text-decoration: none;
    color: inherit;
    cursor: grab;
  }
  /* Dragging needs `touch-action: none`, which the grid sets in the tile's inline
     style. Narrowing it (for example to `pan-x`) makes the browser claim the gesture,
     so the drag library's `preventDefault()` on touchmove is ignored and the console
     reports a non-cancelable touchmove. A touch on a tile therefore belongs to the
     tile, not the canvas; the canvas is panned from its own background instead. */
  .grid-tile[data-dragging] {
    cursor: grabbing;
    z-index: 10;
  }
  .grid-tile:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 3px;
    z-index: 2;
  }
</style>

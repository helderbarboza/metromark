<script lang='ts'>
  import type { CommonTileProps } from '$lib/components/tile-props'
  import type { Box, Rect } from '$lib/folder-tile-layout'
  import type { FolderTileView, PreviewCell } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import FaviconImage from '$lib/components/molecules/FaviconImage.svelte'
  import TileShell from '$lib/components/molecules/TileShell.svelte'
  import { tileVariants } from '$lib/components/tile-variants'
  import { APPEARANCE_DEFAULTS, SETTINGS_DEFAULTS } from '$lib/config'
  import { FOLDER_COLUMNS, FOLDER_PREVIEW, FOLDER_ROWS } from '$lib/folder-preview'
  import { gridPlacements, layoutPlacements, titleRect, ZERO_RECT } from '$lib/folder-tile-layout'
  import { resolveTileColors } from '$lib/theme-colors'
  import { flip3d } from '$lib/transition'
  import { cn } from '$lib/utils.js'
  import { getWorkspace, hasWorkspace } from '$lib/workspace-context'
  import { mode, theme } from 'mode-watcher'
  import { onDestroy, untrack } from 'svelte'
  import { expoOut } from 'svelte/easing'
  import { Tween } from 'svelte/motion'
  import { SvelteMap } from 'svelte/reactivity'

  interface Props extends CommonTileProps {
    tile: FolderTileView
  }

  const {
    tile,
    size,
    selected = false,
    revealed = false,
    cutout = false,
    dataTestId = 'folder-tile',
    ...rest
  }: Props = $props()

  /** Base duration in ms for tweens and enter/exit effects. */
  const MOTION_MS = 300
  /** Share of the duration a whole stagger wave may take. */
  const STAGGER_RATIO = 0.2
  /** Cells past this step share the wave's last delay. */
  const MAX_STAGGER_STEPS = 15
  /** Fraction of the duration a box must stay still before a new structure is committed. */
  const SETTLE_RATIO = 0.1
  /** Fraction of the duration before the title starts, after cells begin entering. */
  const TITLE_DELAY_RATIO = 0.5

  const readWorkspace = hasWorkspace()
    ? getWorkspace()
    : undefined
  const reducedMotion = $derived(
    readWorkspace?.().reducedMotion ?? SETTINGS_DEFAULTS.reducedMotion,
  )

  /** All timings collapse to zero under reduced motion. */
  const motionDuration = $derived(reducedMotion ? 0 : MOTION_MS)
  const staggerWindow = $derived(motionDuration * STAGGER_RATIO)
  /** Debounce before committing a new cell structure (15 ms by default, 0 under reduced motion). */
  const settleMs = $derived(motionDuration * SETTLE_RATIO)

  /** Delay for a wave step, capped at `staggerWindow`. */
  const stagger = (order: number) =>
    Math.min(order / MAX_STAGGER_STEPS, 1) * staggerWindow

  /** Anti-diagonal (row + column) order: cells nearest the top-left come first. */
  const diagonalOrder = (index: number, cols: number) =>
    Math.floor(index / cols) + (index % cols)

  const ui = $derived(tileVariants({ size, selected, revealed, cutout }))

  const cols = $derived(Math.max(1, FOLDER_COLUMNS[size]))
  const iconRows = $derived(FOLDER_ROWS[size] - (size === 'small'
    ? 0
    : 1))
  const hasTitle = $derived(size !== 'small')

  /** Rendering waits for the first measurement, so cells never animate from a zero box. */
  let container: HTMLDivElement | undefined = $state()
  let box: Box = $state({ width: 0, height: 0 })
  const measured = $derived(box.width > 0 && box.height > 0)

  $effect(() => {
    const el = container
    if (!el)
      return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (!entry)
        return
      const { width, height } = entry.contentRect
      box = { width, height }
    })
    observer.observe(el)
    return () => observer.disconnect()
  })

  type BaseSlot = { key: string }
  interface BlankSlot extends BaseSlot { kind: 'blank' }
  interface FolderSlot extends BaseSlot { kind: 'folder', cell: PreviewCell }
  interface BookmarkSlot extends BaseSlot {
    kind: 'bookmark'
    cell: PreviewCell
    bg: string
    tint: string
  }
  /** Blank slots keep the mosaic's shape when the folder is sparse. */
  type Slot = BlankSlot | FolderSlot | BookmarkSlot

  /** Preview cells with blank padding; colors resolve from the current theme. */
  const cells = $derived.by((): Slot[] => {
    // Track mode/theme so resolved colors repaint on change.
    void mode.current
    void theme.current
    return Array.from({ length: FOLDER_PREVIEW[size] }, (_, index) => {
      const cell = tile.preview[index]
      if (!cell)
        return { key: `blank_${index}`, kind: 'blank' } satisfies BlankSlot

      if (cell.kind === 'folder')
        return { key: `folder_${cell.id}`, kind: 'folder', cell } satisfies FolderSlot

      const colorIndex = cell.colorIndex ?? APPEARANCE_DEFAULTS.colorIndex
      const colors = resolveTileColors({ colorIndex, color: cell.color })
      return {
        key: `bookmark_${cell.id}`,
        kind: 'bookmark',
        cell,
        bg: colors.bg,
        tint: colors.fg === 1
          ? '#ffffff'
          : '#000000',
      } satisfies BookmarkSlot
    })
  })

  /** Identity of a layout: size plus the ordered cell keys. */
  const structureKey = $derived(`${size}|${cells.map(c => c.key).join(',')}`)

  /**
   * The committed structure and the box it was laid out for. A new structure is committed
   * only after the box settles, so cells are never laid out at a size the tile hasn't reached.
   */
  interface Shown {
    key: string
    cells: Slot[]
    keys: string[]
    cols: number
    iconRows: number
    hasTitle: boolean
    box: Box
  }
  let shown = $state.raw<Shown | null>(null)

  function commit(): void {
    shown = {
      key: structureKey,
      cells,
      keys: cells.map(c => c.key),
      cols,
      iconRows,
      hasTitle,
      box,
    }
  }

  /** Grid placements are 1x1 for now; spans would only change this line. */
  const rects = $derived(shown
    ? layoutPlacements(
      gridPlacements(shown.keys, shown.cols),
      { box: shown.box, cols: shown.cols, iconRows: shown.iconRows },
    )
    : new SvelteMap<string, Rect>())
  const title = $derived(shown
    ? titleRect({ box: shown.box, cols: shown.cols, iconRows: shown.iconRows })
    : ZERO_RECT)

  function rectOf(key: string): Rect {
    return rects.get(key) ?? ZERO_RECT
  }

  /**
   * Keys of the previously shown layout. Intentionally not reactive: it is updated in an
   * effect after DOM updates and must not retrigger `enterOrder`.
   */
  let previousKeys = new Set<string>()

  /** Anti-diagonal order of cells entering with the committed structure. */
  const enterOrder = $derived.by(() => {
    const order = new SvelteMap<string, number>()
    if (!shown)
      return order
    for (const [index, cell] of shown.cells.entries()) {
      if (!previousKeys.has(cell.key))
        order.set(cell.key, diagonalOrder(index, shown.cols))
    }
    return order
  })

  $effect(() => {
    if (shown)
      previousKeys = new Set(shown.keys)
  })

  // Commit immediately with no prior structure; follow box/content changes in place;
  // debounce a new structure briefly, with a deadline fixed at the first observation so a
  // continuous CSS resize cannot keep the old structure alive indefinitely.
  let pendingCommit = 0
  let pendingDeadline = 0

  function clearPending(): void {
    if (pendingCommit)
      clearTimeout(pendingCommit)
    pendingCommit = 0
    pendingDeadline = 0
  }

  $effect(() => {
    if (!measured) {
      clearPending()
      return
    }
    const key = structureKey
    const liveCells = cells
    const liveBox = box
    untrack(() => {
      if (shown === null) {
        commit()
        return
      }
      if (shown.key === key) {
        clearPending()
        shown = { ...shown, cells: liveCells, box: liveBox }
        return
      }
      // Reduced motion collapses every timing to zero: commit now, not on a macrotask.
      if (settleMs === 0) {
        clearPending()
        commit()
        return
      }
      const now = performance.now()
      if (!pendingDeadline)
        pendingDeadline = now + settleMs
      clearTimeout(pendingCommit)
      pendingCommit = window.setTimeout(() => {
        pendingCommit = 0
        pendingDeadline = 0
        commit()
      }, Math.max(0, pendingDeadline - now))
    })
  })

  /**
   * JS-driven layout for each cell and the title. Svelte's enter/exit effects stay on the
   * inner elements so they cannot override these transforms.
   */
  const tweens = new SvelteMap<string, Tween<Rect>>()

  /**
   * Current tweened rect for a key, or the target rect until a tween exists.
   * Pure read, safe to call during render.
   */
  function boxOf(key: string, fallback: Rect): Rect {
    const tween = tweens.get(key)
    return tween ? tween.current : fallback
  }

  // `Tween` runs its animation on a raf task that is not tied to effect teardown, and it
  // exposes no abort method; setting duration 0 is the public way to stop that task.
  onDestroy(() => {
    clearPending()
    for (const tween of tweens.values())
      void tween.set(tween.target, { duration: 0 })
    tweens.clear()
  })

  /** Last committed structure; only a change to it triggers the staggered animation. */
  let lastStructure = ''
  /**
   * Deadline (performance.now) for retargeting box-only tweens. After it they snap,
   * so a drag follows the pointer.
   */
  let settleUntil = 0

  $effect(() => {
    if (!shown)
      return
    const structural = shown.key !== lastStructure
    lastStructure = shown.key

    const now = performance.now()
    if (structural)
      settleUntil = now + motionDuration
    const remaining = Math.max(0, settleUntil - now)
    const duration = structural ? motionDuration : remaining

    const targets = new SvelteMap<string, Rect>(rects)
    if (shown.hasTitle)
      targets.set('title', title)

    // Only cells follow the wave; the title uses TITLE_DELAY_RATIO in the template.
    const shownCols = shown.cols
    const waveOrder = new SvelteMap(
      shown.keys.map((key, index) => [
        key,
        diagonalOrder(index, shownCols),
      ] as const),
    )

    untrack(() => {
      for (const [key, rect] of targets) {
        // Retargets skip the stagger: restarting their delay on every box change would stall them.
        const delay = structural
          ? stagger(waveOrder.get(key) ?? 0)
          : 0
        let tween = tweens.get(key)
        if (!tween) {
          tween = new Tween<Rect>({ ...rect }, { duration, easing: expoOut })
          tweens.set(key, tween)
        }
        void tween.set({ ...rect }, { duration, easing: expoOut, delay })
      }

      // Drop tweens for cells that are gone. Exiting cells keep their own reference.
      for (const key of [
        ...tweens.keys(),
      ]) {
        if (!targets.has(key))
          tweens.delete(key)
      }
    })
  })
</script>

<TileShell
  {...rest}
  {tile}
  {size}
  {selected}
  {revealed}
  {cutout}
  dataTestId={dataTestId}
  defaultLabel={$LL.app.folderTileSummary({ title: tile.title })}
  resizeNoun={$LL.app.resizeNounFolderTile()}
>
  {#snippet content()}
    <div
      bind:this={container}
      class='relative h-full overflow-hidden'
      aria-hidden='true'
    >
      {#if measured && shown}

        {#if shown.hasTitle}
          {@const titlePos = boxOf('title', title)}
          <div
            class='absolute top-0 left-0'
            data-preview-title=''
            style:transform={`translate(${titlePos.x}px, ${titlePos.y}px)`}
            style:width={`${titlePos.w}px`}
            style:height={`${titlePos.h}px`}
          >
            <div
              class={cn(ui.background(), 'flex size-full items-end justify-start')}
              in:flip3d={{
                hinge: 'top',
                duration: motionDuration,
                delay: motionDuration * TITLE_DELAY_RATIO,
                easing: expoOut,
              }}
              out:flip3d={{
                hinge: 'top',
                duration: motionDuration,
              }}
            >
              <div class='min-h-0 w-full text-left'>
                <div class={cn(ui.label(), 'min-w-0 flex-1')}>
                  <span class={cn(ui.title(), 'block w-full min-w-0 truncate')}>{tile.title}</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
        {#each shown.cells as cell (cell.key)}
          {@const enterDelay = stagger(enterOrder.get(cell.key) ?? 0)}
          {@const pos = boxOf(cell.key, rectOf(cell.key))}
          <!--
            Outer: layout only. Tweens own its position and size; Svelte never animates it.
          -->
          <div
            class='absolute top-0 left-0'
            data-preview-cell={cell.key}
            style:transform={`translate(${pos.x}px, ${pos.y}px)`}
            style:width={`${pos.w}px`}
            style:height={`${pos.h}px`}
          >
            <!--
              Inner: in:flip3d / out:flip3d animate this element, safely separated from the
              layout transform on the outer element. Keep the directives on the each-item
              root (not inside an {#if}) so the exit plays when the cell is removed.
            -->
            <div
              class='size-full'
              in:flip3d={{
                hinge: 'top',
                duration: motionDuration,
                delay: enterDelay,
                perspective: 200,
              }}
              out:flip3d={{
                hinge: 'top',
                duration: motionDuration,
              }}
            >
              {#if cell.kind === 'blank'}
                <div class={cutout ? 'size-full' : 'size-full bg-(--tile-bg)'}></div>
              {:else if cell.kind === 'folder'}
                <div
                  class={cn(
                    'flex size-full items-center justify-center',
                    !cutout && 'bg-(--tile-bg)',
                  )}
                  style:color={cutout ? '#ffffff' : undefined}
                >
                  <Icon name='folder' class='size-[55%]' />
                </div>
              {:else}
                <div
                  class='@container flex size-full items-center justify-center'
                  style:background={cutout ? undefined : cell.bg}
                  style:color={cutout ? '#ffffff' : cell.tint}
                >
                  <FaviconImage
                    pageUrl={cell.cell.url ?? ''}
                    tint={cutout ? '#ffffff' : cell.tint}
                    class='size-[55cqw]'
                  />
                </div>
              {/if}
            </div>
          </div>
        {/each}

      {/if}
    </div>
  {/snippet}
</TileShell>

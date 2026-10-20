<script lang='ts'>
  import type { MenuItem } from './lib/components/ContextMenu.svelte'
  import type { DialogSpec } from './lib/components/Editor.svelte'
  import type { ThemeMode } from './lib/theme-picker'
  import type {
    Client,
    Command,
    Layout,
    Notice,
    Snapshot,
    TileSize,
  } from './lib/types'
  import { SnapGridGroup } from '@snapgridjs/svelte'
  import { mode, ModeWatcher, theme } from 'mode-watcher'
  import { onMount } from 'svelte'
  import Button from './lib/components/Button.svelte'
  import ContextMenu from './lib/components/ContextMenu.svelte'
  import Editor from './lib/components/Editor.svelte'
  import Icon from './lib/components/Icon.svelte'
  import IconButton from './lib/components/IconButton.svelte'
  import MetroAppBar from './lib/components/MetroAppBar.svelte'
  import MetroGroup from './lib/components/MetroGroup.svelte'
  import UndoToast from './lib/components/UndoToast.svelte'
  import { toggleSelection } from './lib/interaction'
  import { cellsToPx, GAP, reconcileLayout, ROWS } from './lib/layout'
  import { applyThemeForMode } from './lib/theme-picker'
  import {
    countBookmarks,
    flatten,
    indexTree,
    isBookmark,
    projectGroups,
  } from './lib/tree'

  const { client }: { client: Client } = $props()
  let snapshot = $state.raw<Snapshot | null>(null)
  let loadError = $state('')
  let query = $state('')
  let rootFilter = $state('all')
  let dragging = $state(false)
  // Single selection for now: uwp8 p. 79 defines selection as marking without
  // launching, and `toggleSelection` is the one place a future multi-select
  // (selection basket) has to change.
  let selectedId = $state<string | null>(null)
  let selectionOrigin = $state<HTMLElement | null>(null)
  let focusRequest = $state(0)
  let busy = $state(false)
  let now = $state(Date.now())
  let viewportHeight = $state(800)
  let scroller = $state<HTMLElement | null>(null)
  let searchInput: HTMLInputElement
  let scrollProgress = $state(0)
  let canScroll = $state(false)
  let activeGroup = $state(0)
  let draftLayouts = $state.raw<Record<string, Layout>>({})
  let layoutTimer: ReturnType<typeof setTimeout> | undefined
  let gestureTimer: ReturnType<typeof setTimeout> | undefined
  let dialog = $state<DialogSpec | null>(null)
  let context = $state<{
    target: 'tile' | 'group' | 'canvas'
    id: string
    x: number
    y: number
  } | null>(null)
  let contextOrigin: HTMLElement | null = null
  // Extra commands for the selected tile, opened from the app bar (uwp8 p. 157).
  let more = $state<{
    x: number
    y: number
    origin: HTMLElement | null
  } | null>(null)
  let notice = $state<Notice | null>(null)
  let noticeUntil = $state(0)

  const groups = $derived(snapshot ? projectGroups(snapshot) : [])
  const allTiles = $derived(
    Object.fromEntries(groups.flatMap(group => Object.entries(group.tiles))),
  )
  const selectedTile = $derived(selectedId ? allTiles[selectedId] : undefined)
  const contextTile = $derived(
    context?.target === 'tile' ? allTiles[context.id] : undefined,
  )
  const nodes = $derived(indexTree(snapshot?.tree ?? []))
  const roots = $derived(
    (snapshot?.tree ?? [])
      .flatMap(root => root.children ?? [])
      .filter(node => !isBookmark(node) && node.type !== 'separator'),
  )
  const bookmarkCount = $derived(
    flatten(snapshot?.tree ?? []).filter(isBookmark).length,
  )
  const folderCount = $derived(
    groups.filter(group => !group.isSystem).length,
  )
  const cell = $derived(
    Math.max(
      34,
      Math.min(
        snapshot?.settings.density === 'compact' ? 54 : 68,
        Math.floor((viewportHeight - 279 - (ROWS - 1) * GAP) / ROWS),
      ),
    ),
  )
  const normalizedQuery = $derived(query.trim().toLowerCase())
  const visibleGroups = $derived.by(() => {
    const filtered = groups.filter(
      group => rootFilter === 'all' || group.rootId === rootFilter,
    )
    if (!normalizedQuery || !snapshot)
      return filtered
    return filtered
      .map((group) => {
        const matchesPath = group.path
          .join(' / ')
          .toLowerCase()
          .includes(normalizedQuery)
        const matching = Object.values(group.tiles).filter((tile) => {
          const matchesTile = `${tile.title} ${tile.url}`
            .toLowerCase()
            .includes(normalizedQuery)
          return matchesPath || matchesTile
        })
        const sizes = Object.fromEntries(
          matching.map(tile => [
            tile.id,
            { ...snapshot!.appearance[tile.id], size: tile.size },
          ]),
        )
        return {
          ...group,
          layout: reconcileLayout(
            matching.map(tile => ({
              id: tile.id,
              title: tile.title,
              url: tile.url,
            })),
            [],
            sizes,
          ),
        }
      })
      .filter(group => group.layout.length)
  })
  const undo = $derived(
    notice?.undoId
      ? snapshot?.undos.find(
        entry => entry.id === notice?.undoId && entry.expiresAt > now,
      )
      : undefined,
  )

  function applySnapshot(value: Snapshot) {
    snapshot = value
    if (
      selectedId
      && !flatten(value.tree).some(node => node.id === selectedId)
    ) {
      selectedId = null
    }
    if (
      rootFilter !== 'all'
      && !flatten(value.tree).some(node => node.id === rootFilter)
    ) {
      rootFilter = 'all'
    }
  }
  function showNotice(value: Notice, expiration?: number) {
    notice = value
    noticeUntil
      = expiration ?? Date.now() + (value.tone === 'error' ? 9000 : 4500)
  }
  async function execute(command: Command): Promise<boolean> {
    busy = true
    try {
      const result = await client.execute(command)
      applySnapshot(result.snapshot)
      if (result.notice) {
        showNotice(
          result.notice,
          result.notice.undoId
            ? result.snapshot.undos.find(
              entry => entry.id === result.notice?.undoId,
            )?.expiresAt
            : undefined,
        )
      }
      return true
    }
    catch (error) {
      showNotice({
        message:
          error instanceof Error ? error.message : 'The operation failed.',
        tone: 'error',
      })
      try {
        applySnapshot(await client.snapshot())
      }
      catch {
      /* The existing view remains visible while disconnected. */
      }
      return false
    }
    finally {
      busy = false
    }
  }
  onMount(() => {
    const unsubscribe = client.subscribe(applySnapshot)
    void client
      .snapshot()
      .then((value) => {
        applySnapshot(value)
        const pending = value.undos
          .filter(entry => entry.expiresAt > Date.now())
          .at(-1)
        if (pending) {
          showNotice(
            { message: pending.label, undoId: pending.id },
            pending.expiresAt,
          )
        }
      })
      .catch((error: unknown) => {
        loadError
          = error instanceof Error ? error.message : 'Unable to load bookmarks.'
      })
    const resize = () => {
      viewportHeight = window.innerHeight
      updateScroll()
    }
    resize()
    window.addEventListener('resize', resize)
    const clock = setInterval(() => {
      now = Date.now()
    }, 300)
    return () => {
      unsubscribe()
      client.dispose()
      window.removeEventListener('resize', resize)
      clearInterval(clock)
      clearTimeout(layoutTimer)
      clearTimeout(gestureTimer)
      cancelSmoothScroll()
    }
  })
  $effect(() => {
    if (notice && now >= noticeUntil)
      notice = null
  })
  $effect(() => {
    void visibleGroups
    void cell
    requestAnimationFrame(updateScroll)
  })

  let themeColorProbe: HTMLSpanElement
  let lastAppliedMode = $state<ThemeMode | null>(null)

  $effect(() => {
    const resolvedMode = mode.current
    if (!resolvedMode || resolvedMode === lastAppliedMode)
      return
    lastAppliedMode = resolvedMode
    applyThemeForMode(resolvedMode)
  })

  $effect(() => {
    const activeTheme = theme.current
    if (!activeTheme || !themeColorProbe)
      return

    const color = getComputedStyle(themeColorProbe).backgroundColor
    if (!color || color === 'rgba(0, 0, 0, 0)')
      return

    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', color)
  })

  function defaultFolder() {
    return (
      groups.find(group => group.id === rootFilter && group.writable)?.id
      ?? groups.find(group => group.writable)?.id
      ?? ''
    )
  }
  function edit(spec: DialogSpec) {
    dialog = spec
    selectedId = spec.id ?? selectedId
  }
  /** Right-click, the menu key, or Shift+F10 on a tile marks it selected (uwp8 p. 158). */
  function selectTile(event: MouseEvent, id: string) {
    event.preventDefault()
    event.stopPropagation()
    const tile = allTiles[id]
    // Commands for objects that cannot be selected stay in a context menu (p. 160).
    if (!tile?.writable) {
      showContext(event, 'tile', id)
      return
    }
    selectionOrigin
      = (event.target as HTMLElement).closest<HTMLElement>('a, button') ?? null
    // Right-click always shows the commands for the tile it was pressed on; the
    // cross-slide gesture is what cancels a selection (uwp8 pp. 81-82).
    selectedId = id
    // Marking an item also gives it focus, so Escape can hand focus back.
    selectionOrigin?.focus({ preventScroll: true })
    if (event.clientX === 0 && event.clientY === 0)
      focusRequest += 1
  }
  /** Tiles select; group headers and the canvas keep their own menus. */
  function contextFor(
    event: MouseEvent,
    target: 'tile' | 'group' | 'canvas',
    id: string,
  ) {
    if (target === 'tile')
      selectTile(event, id)
    else showContext(event, target, id)
  }
  /** Cross-slide selection from a touch or pen gesture (uwp8 pp. 79-80). */
  function selectByGesture(id: string, event: PointerEvent) {
    selectionOrigin
      = (event.target as HTMLElement).closest<HTMLElement>('a, button') ?? null
    selectedId = toggleSelection(selectedId, id)
  }
  function clearSelection() {
    if (!selectedId)
      return
    // Escape and the app bar's own commands leave focus stranded when the bar unmounts.
    const keyboard
      = document.activeElement instanceof HTMLElement
        && document.activeElement.closest('[role="toolbar"]') !== null
    selectedId = null
    more = null
    if (keyboard)
      selectionOrigin?.focus({ preventScroll: true })
    selectionOrigin = null
  }
  function canvasPointerDown(event: PointerEvent) {
    if (dragging)
      return
    // Activating a tile opens it; pressing anywhere else drops the selection (p. 82).
    if ((event.target as HTMLElement).closest('[data-grid-id], .tile-slot'))
      return
    clearSelection()
  }
  /** Searching replaces the grid with a filtered, non-interactive view. */
  function search(event: Event) {
    query = (event.currentTarget as HTMLInputElement).value
    if (query.trim())
      clearSelection()
  }
  function closeContext() {
    context = null
    contextOrigin?.focus({ preventScroll: true })
  }
  function openMore(event: MouseEvent) {
    const origin = event.currentTarget as HTMLElement
    const rect = origin.getBoundingClientRect()
    more = { x: rect.left, y: rect.top, origin }
  }
  function closeMore() {
    const origin = more?.origin ?? null
    more = null
    origin?.focus({ preventScroll: true })
  }
  function showContext(
    event: MouseEvent,
    target: 'tile' | 'group' | 'canvas',
    id: string,
  ) {
    event.preventDefault()
    event.stopPropagation()
    contextOrigin
      = (event.target as HTMLElement).closest<HTMLElement>('a, button') ?? null
    const rect = contextOrigin?.getBoundingClientRect()
    const keyboardOrButton
      = event.type === 'click' || (event.clientX === 0 && event.clientY === 0)
    context = {
      target,
      id,
      x: keyboardOrButton && rect ? rect.left : event.clientX,
      y: keyboardOrButton && rect ? rect.bottom + 7 : event.clientY,
    }
  }
  async function open(url: string, disposition: 'tab' | 'window') {
    try {
      await client.open(url, disposition)
    }
    catch (error) {
      showNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Unable to open this address.',
        tone: 'error',
      })
    }
  }
  async function copy(id: string) {
    const url = allTiles[id]?.url
    if (!url)
      return
    try {
      await navigator.clipboard.writeText(url)
      showNotice({ message: 'Website address copied.' })
    }
    catch {
      edit({ kind: 'copy', id })
    }
  }
  const menuItems = $derived.by((): MenuItem[] => {
    if (!context)
      return []
    const node = nodes.get(context.id)
    const tile = contextTile
    if (context.target === 'tile' && tile) {
      return [
        {
          label: 'Open in new tab',
          icon: 'external',
          action: () => {
            void open(tile.url, 'tab')
          },
        },
        {
          label: 'Open in new window',
          icon: 'desktop',
          action: () => {
            void open(tile.url, 'window')
          },
        },
        {
          label: 'Edit bookmark',
          icon: 'edit',
          separator: true,
          disabled: !tile.writable,
          action: () => edit({ kind: 'bookmark', id: tile.id }),
        },
        {
          label: 'Move to folder',
          icon: 'folder',
          disabled: !tile.writable,
          action: () => edit({ kind: 'move', id: tile.id }),
        },
        {
          label: 'Customize tile',
          icon: 'arrange',
          action: () => edit({ kind: 'appearance', id: tile.id }),
        },
        {
          label: 'Copy website address',
          icon: 'copy',
          action: () => {
            void copy(tile.id)
          },
        },
        {
          label: 'Delete bookmark',
          icon: 'trash',
          separator: true,
          danger: true,
          disabled: !tile.writable,
          action: () => {
            void execute({ type: 'node.remove', id: tile.id })
          },
        },
      ]
    }
    if (context.target === 'group' && node) {
      const group = groups.find(group => group.id === node.id)
      return [
        {
          label: 'Add bookmark here',
          icon: 'plus',
          disabled: !group?.writable,
          action: () => edit({ kind: 'bookmark', parentId: node.id }),
        },
        {
          label: 'Create child folder',
          icon: 'folder',
          disabled: !group?.writable,
          action: () => edit({ kind: 'folder', parentId: node.id }),
        },
        {
          label: 'Rename folder',
          icon: 'edit',
          separator: true,
          disabled: !group?.mutable,
          action: () => edit({ kind: 'rename', id: node.id }),
        },
        {
          label: 'Move folder',
          icon: 'folder',
          disabled: !group?.mutable,
          action: () => edit({ kind: 'move', id: node.id }),
        },
        {
          label: 'Delete folder',
          icon: 'trash',
          separator: true,
          danger: true,
          disabled: !group?.mutable,
          action: () => edit({ kind: 'delete', id: node.id }),
        },
      ]
    }
    const parentId
      = groups.find(group => group.id === context?.id && group.writable)?.id
        ?? defaultFolder()
    return [
      {
        label: 'Add bookmark',
        icon: 'plus',
        disabled: !parentId,
        action: () => edit({ kind: 'bookmark', parentId }),
      },
      {
        label: 'Create folder / group',
        icon: 'folder',
        disabled: !parentId,
        action: () => edit({ kind: 'folder', parentId }),
      },
      ...(!selectedId
        ? []
        : [
          {
            label: 'Clear selection',
            icon: 'close',
            separator: true,
            action: () => clearSelection(),
          },
        ]),
      {
        label: 'Search bookmarks',
        icon: 'search',
        action: () => searchInput.focus(),
      },
      {
        label: 'Appearance & settings',
        icon: 'settings',
        separator: true,
        action: () => edit({ kind: 'settings' }),
      },
    ]
  })
  // Commands that stay off the app bar itself live in a menu opened from one of
  // its buttons (uwp8 p. 157), so they are not duplicated as bar commands.
  const appBarMenuItems = $derived.by((): MenuItem[] => {
    const tile = selectedTile
    if (!tile)
      return []
    return [
      {
        label: 'Open in new tab',
        icon: 'external',
        action: () => {
          void open(tile.url, 'tab')
        },
      },
      {
        label: 'Open in new window',
        icon: 'desktop',
        action: () => {
          void open(tile.url, 'window')
        },
      },
      {
        label: 'Copy website address',
        icon: 'copy',
        action: () => {
          void copy(tile.id)
        },
      },
      {
        label: 'Customize tile',
        icon: 'arrange',
        separator: true,
        action: () => edit({ kind: 'appearance', id: tile.id }),
      },
    ]
  })
  function resizeTile(id: string, size: TileSize) {
    void execute({ type: 'tile.appearance', id, patch: { size } })
  }
  function stageLayout(id: string, layout: Layout) {
    draftLayouts = { ...draftLayouts, [id]: layout }
    clearTimeout(layoutTimer)
    // Source and destination callbacks belong to one gesture. Never treat source removal as deletion.
    layoutTimer = setTimeout(() => {
      const committed = structuredClone(draftLayouts)
      void execute({ type: 'layout.commit', layouts: committed }).finally(
        () => {
          draftLayouts = {}
        },
      )
    }, 35)
  }
  function dragStop() {
    clearTimeout(gestureTimer)
    gestureTimer = setTimeout(() => {
      dragging = false
      // Restore the canvas's own smooth scrolling once the gesture is over.
      if (scroller)
        scroller.style.scrollBehavior = ''
    }, 180)
  }
  let targetScroll = 0
  let currentScroll = 0
  let smoothFrame: number | null = null

  function updateScroll() {
    if (!scroller)
      return
    const max = scroller.scrollWidth - scroller.clientWidth
    canScroll = max > 3
    scrollProgress = max > 0 ? scroller.scrollLeft / max : 0
    if (smoothFrame === null) {
      targetScroll = scroller.scrollLeft
      currentScroll = scroller.scrollLeft
    }
    const elements = [
      ...scroller.querySelectorAll<HTMLElement>('.metro-group'),
    ]
    const left = scroller.scrollLeft + 80
    activeGroup = Math.max(
      0,
      elements.findLastIndex(element => element.offsetLeft <= left),
    )
  }

  function cancelSmoothScroll() {
    if (smoothFrame !== null) {
      cancelAnimationFrame(smoothFrame)
      smoothFrame = null
    }
    if (scroller)
      scroller.style.scrollBehavior = ''
  }

  function smoothScroll() {
    if (!scroller) {
      smoothFrame = null
      return
    }
    const diff = targetScroll - currentScroll

    // Stop when close enough
    if (Math.abs(diff) < 0.5) {
      currentScroll = targetScroll
      scroller.scrollLeft = currentScroll
      smoothFrame = null
      scroller.style.scrollBehavior = ''
      return
    }

    currentScroll += diff * 0.15 // easing factor (lower = smoother/slower)
    scroller.scrollLeft = currentScroll
    smoothFrame = requestAnimationFrame(smoothScroll)
  }

  function wheel(event: WheelEvent) {
    if (
      !scroller
      || event.ctrlKey
      || !canScroll
      || Math.abs(event.deltaX) >= Math.abs(event.deltaY)
    ) {
      return
    }

    if (scroller.scrollHeight > scroller.clientHeight + 4 && !event.shiftKey)
      return

    event.preventDefault()

    const delta
      = event.deltaY
        * (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
          ? scroller.clientWidth
          : 1)

    if (snapshot?.settings.reducedMotion) {
      cancelSmoothScroll()
      scroller.scrollLeft += delta
      targetScroll = scroller.scrollLeft
      currentScroll = scroller.scrollLeft
      return
    }

    if (smoothFrame === null) {
      // Resync in case of external scrolls (scrollbar, keyboard, buttons).
      targetScroll = scroller.scrollLeft
      currentScroll = scroller.scrollLeft
      // Avoid CSS smooth behavior double-smoothing direct scrollLeft writes.
      scroller.style.scrollBehavior = 'auto'
    }

    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    targetScroll = Math.min(Math.max(targetScroll + delta, 0), maxScroll)

    if (smoothFrame === null) {
      smoothFrame = requestAnimationFrame(smoothScroll)
    }
  }

  function scroll(direction: -1 | 1) {
    cancelSmoothScroll()
    scroller?.scrollBy({
      left: direction * Math.max(250, scroller.clientWidth * 0.65),
      behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth',
    })
  }
  function jump(index: number) {
    const element
      = scroller?.querySelectorAll<HTMLElement>('.metro-group')[index]
    if (element && scroller)
      cancelSmoothScroll()
    if (element && scroller) {
      scroller.scrollTo({
        left: Math.max(0, element.offsetLeft - 68),
        behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth',
      })
    }
  }
  function key(event: KeyboardEvent) {
    const input
      = event.target instanceof HTMLElement
        && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)
    if (dialog || context || more)
      return
    if (
      !input
      && (event.key === '/'
        || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'))
    ) {
      event.preventDefault()
      searchInput.focus()
    }
    if (
      !input
      && (event.metaKey || event.ctrlKey)
      && event.key.toLowerCase() === 'z'
    ) {
      const recent = snapshot?.undos
        .filter(entry => entry.expiresAt > now)
        .at(-1)
      if (recent) {
        event.preventDefault()
        performUndo(recent.id)
      }
    }
    if (event.key === 'Escape' && !dragging) {
      if (query)
        query = ''
      // Selection itself is cleared here; the app bar returns focus to its tile.
      clearSelection()
    }
  }
  function performUndo(id: string) {
    if (snapshot?.undos.find(entry => entry.id === id)?.needsDestination)
      edit({ kind: 'restore', undoId: id })
    else void execute({ type: 'undo', id })
  }
</script>

<svelte:window onkeydown={key} />
<ModeWatcher
  defaultMode='system'
  disableHeadScriptInjection
/>
<span
  bind:this={themeColorProbe}
  class='fixed size-px hidden pointer-events-none bg-(--bg)'
  aria-hidden='true'
>
</span>
<div
  class='flex h-dvh w-full flex-col overflow-hidden relative bg-(--bg) text-(--text)'
  class:reduced={snapshot?.settings.reducedMotion}
>
  <header class='shrink-0 px-16 pt-8 max-lg:px-9 max-md:px-6 max-md:pt-6'>
    <div class='flex items-center justify-between gap-5 pb-3.5 max-sm:pb-2.5'>
      <nav
        class='flex min-w-0 gap-1.5 overflow-x-auto p-0.5 scrollbar-thin'
        aria-label='Bookmark roots'
      >
        <button
          class={rootFilter === 'all'
            ? 'flex h-7 items-center gap-2 rounded bg-(--surface-hover) px-2 text-xs whitespace-nowrap text-(--text)'
            : 'flex h-7 items-center gap-2 rounded bg-transparent px-2 text-xs whitespace-nowrap text-(--muted) hover:text-(--text)'}
          aria-pressed={rootFilter === 'all'}
          onclick={() => {
            rootFilter = 'all'
            cancelSmoothScroll()
            scroller?.scrollTo({ left: 0 })
          }}
        >All bookmarks <span
          class={rootFilter === 'all'
            ? 'text-xs text-(--accent)'
            : 'text-xs text-(--muted)'}
        >{bookmarkCount}</span></button>{#each roots as root (root.id)}<button
          class={rootFilter === root.id
            ? 'flex h-7 items-center gap-2 rounded bg-(--surface-hover) px-2 text-xs whitespace-nowrap text-(--text)'
            : 'flex h-7 items-center gap-2 rounded bg-transparent px-2 text-xs whitespace-nowrap text-(--muted) hover:text-(--text)'}
          aria-pressed={rootFilter === root.id}
          onclick={() => {
            rootFilter = root.id
            cancelSmoothScroll()
            scroller?.scrollTo({ left: 0 })
          }}
        >{root.title}<span
          class={rootFilter === root.id
            ? 'text-xs text-(--accent)'
            : 'text-xs text-(--muted)'}
        >{countBookmarks(root)}</span></button>{/each}
      </nav>
    </div>
  </header>

  <!-- Canvas right-click opens the canvas menu (add bookmark/folder, settings). -->
  <main
    id='canvas'
    class='relative min-h-0 flex-1 overflow-auto scroll-smooth  outline-none scrollbar-none [&::-webkit-scrollbar]:hidden  '
    class:is-dragging={dragging}
    bind:this={scroller}
    onscroll={updateScroll}
    onwheel={wheel}
    onpointerdown={canvasPointerDown}
    oncontextmenu={event => showContext(event, 'canvas', defaultFolder())}
    aria-label='Bookmark tile canvas'
    tabindex='-1'
  >
    {#if !snapshot}
      <div class='flex h-full min-h-60 w-full flex-col items-center justify-center text-center text-(--muted)'>
        {#if loadError}
          <Icon name='lock' size={28} />
          <h2 class='mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--text)'>
            Let's reconnect.
          </h2>
          <p class='mb-6 px-5 text-xs leading-relaxed'>{loadError}</p>
          <button class='button' onclick={() => window.location.reload()}>Reload page</button>
        {:else}
          <span class='mb-5 size-6 animate-spin rounded-full border border-(--line) border-t-(--accent)'></span>
          <p class='mb-6 px-5 text-xs leading-relaxed'>
            Finding your favorites…
          </p>
        {/if}
      </div>
    {:else if normalizedQuery && !visibleGroups.length}
      <div class='flex h-full min-h-60 w-full flex-col items-center justify-center text-center text-(--muted)'>
        <Icon name='search' size={33} />
        <h2 class='mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--text)'>
          No favorites found.
        </h2>
        <p class='mb-6 px-5 text-xs leading-relaxed'>
          Nothing matches “{query}”. Try a title, website, or folder.
        </p>
        <Button onclick={() => (query = '')}>Clear search</Button>
      </div>
    {:else}
      <SnapGridGroup>
        <div class='flex w-max items-center h-full gap-9 px-16 max-lg:gap-7 max-lg:px-9 max-md:px-6'>
          {#each visibleGroups as group (group.id)}
            <MetroGroup
              {group}
              layout={draftLayouts[group.id] ?? group.layout}
              tiles={allTiles}
              {cell}
              draggable={!normalizedQuery}
              {dragging}
              {selectedId}
              showDomains={snapshot.settings.showDomains}
              preview={client.mode === 'preview'}
              onLayoutChange={stageLayout}
              onDragStart={() => {
                dragging = true
                // A tile on the way to another group must not keep the app bar (uwp8 p. 82).
                selectedId = null
                selectionOrigin = null
                // An in-flight smooth scroll would fight the drag and keep the canvas
                // moving under the pointer, so stop it and hold scrolling still.
                cancelSmoothScroll()
                if (scroller)
                  scroller.style.scrollBehavior = 'auto'
              }}
              onDragStop={dragStop}
              onSelect={selectByGesture}
              onContext={contextFor}
              onAdd={parentId => edit({ kind: 'bookmark', parentId })}
              onBlocked={message => showNotice({ message, tone: 'error' })}
            />
          {/each}
          {#if !normalizedQuery && defaultFolder()}<div class='w-48 shrink-0'>
            <div class='flex h-15 items-center pt-2.5 text-xs tracking-widest text-(--muted)'>
              A LITTLE MORE SPACE
            </div>
            <button
              class='relative flex w-full flex-col items-center justify-center border border-dashed border-(--line) bg-transparent text-(--muted) transition-colors duration-150 hover:border-(--muted) hover:bg-(--surface) hover:text-(--text)'
              style:height='{cellsToPx(ROWS, cell)}px'
              onclick={() => edit({ kind: 'folder', parentId: defaultFolder() })}
            >
              <span class='mb-5 flex size-12 items-center justify-center rounded-full border border-(--line)'>
                <Icon name='plus' size={23} />
              </span>
              <strong class='text-sm font-medium text-(--text)'>New group</strong><span class='mt-2 text-xs'>Create a bookmark folder</span>
              <span class='absolute top-4 right-4 opacity-60'><Icon name='arrow' size={16} /></span>
            </button>
          </div>{/if}
          {#if !visibleGroups.length && !normalizedQuery}<div class='flex h-full min-h-60 w-full flex-col items-center justify-center text-center text-(--muted)'>
            <h2 class='mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--text)'>
              No bookmark folders available.
            </h2>
            <p class='mb-6 px-5 text-xs leading-relaxed'>
              Create a writable browser bookmark folder to get started.
            </p>
          </div>{/if}
        </div>
      </SnapGridGroup>
    {/if}
  </main>

  <footer class='flex min-h-16 shrink-0 items-center justify-between gap-5 px-16 pb-1.5 max-lg:px-9 max-md:px-6'>
    <span role='status' class='sr-only'>{busy ? 'Saving changes…' : ''}</span>
    <div class='flex shrink-0 items-center'>
      <label class='flex h-8 w-60 items-center gap-2.5 rounded border border-(--line) bg-(--surface) px-3 text-(--muted) focus-within:border-(--accent) max-lg:w-55 max-md:h-9 max-md:w-46'>
        <Icon name='search' size={17} />
        <input
          bind:this={searchInput}
          value={query}
          oninput={search}
          type='search'
          aria-label='Search bookmarks'
          placeholder='Find a bookmark…'
          autocomplete='off'
          spellcheck='false'
          class='w-full min-w-0 bg-transparent p-0 text-xs text-(--text) outline-none placeholder:text-(--muted) [&::-webkit-search-cancel-button]:hidden'
        />
        {#if query}
          <button
            aria-label='Clear search'
            class='bg-transparent p-1 text-(--muted)'
            onclick={() => {
              query = ''
              searchInput.focus()
            }}
          >
            <Icon name='close' size={13} />
          </button>
        {:else}
          <kbd class='flex h-5 w-4 items-center justify-center rounded border border-(--line) font-inherit text-xs'>/</kbd>
        {/if}
      </label>
    </div>
    <div class='flex min-w-0 flex-1 items-center justify-center gap-5'>
      <nav
        class='absolute left-1/2 flex -translate-x-1/2 gap-1.5 p-2.5 max-md:hidden'
        aria-label='Jump to bookmark group'
      >
        {#each visibleGroups as group, index (group.id)}
          <button
            class={activeGroup === index
              ? 'w-4 rounded-full bg-(--accent) p-0 transition-all'
              : 'size-1 rounded-full bg-(--line) p-0 transition-all'}
            aria-label="Jump to {group.path.join(' / ')}"
            aria-current={activeGroup === index ? 'true' : undefined}
            onclick={() => jump(index)}
          >
          </button>
        {/each}
      </nav>
    </div>
    <div class='flex shrink-0 items-center gap-4'>
      <div class='flex items-center gap-1.5 text-xs whitespace-nowrap text-(--muted)'>
        <span class='max-sm:hidden'>{bookmarkCount} bookmarks, {folderCount} folders</span>
        <span class='sm:hidden'>{bookmarkCount} / {folderCount}</span>
        {#if client.mode === 'preview'}
          <span class='rounded border border-(--line) px-1.5 py-0.5 text-xs text-(--muted)' title='saved locally, not your real bookmarks'>Demo</span>
        {/if}
      </div>
      <div class='flex items-center gap-0.5'>
        <IconButton
          label='Scroll groups left'
          class='h-7 w-6 rounded disabled:opacity-25'
          disabled={!canScroll || scrollProgress < 0.01}
          onclick={() => scroll(-1)}
        >
          <Icon name='back' size={17} />
        </IconButton>
        <IconButton
          label='Scroll groups right'
          class='h-7 w-6 rounded disabled:opacity-25'
          disabled={!canScroll || scrollProgress > 0.99}
          onclick={() => scroll(1)}
        >
          <Icon name='chevron' size={17} />
        </IconButton>
      </div>
    </div>
  </footer>
  {#if selectedTile && !dragging}
    <MetroAppBar
      title={selectedTile.title}
      size={selectedTile.size}
      writable={selectedTile.writable}
      {focusRequest}
      onresize={size => resizeTile(selectedTile.id, size)}
      onedit={() => edit({ kind: 'bookmark', id: selectedTile.id })}
      onmove={() => edit({ kind: 'move', id: selectedTile.id })}
      onmore={openMore}
      ondelete={() => {
        void execute({ type: 'node.remove', id: selectedTile.id })
      }}
      onclear={clearSelection}
    />
  {/if}
  {#if more && selectedTile}
    <ContextMenu
      x={more.x}
      y={more.y}
      title={selectedTile.title}
      subtitle={selectedTile.domain}
      items={appBarMenuItems}
      onclose={closeMore}
    />
  {/if}
  {#if context}
    <ContextMenu
      x={context.x}
      y={context.y}
      title={contextTile?.title
        ?? (context.target === 'group'
          ? nodes.get(context.id)?.title
          : 'Your canvas')}
      subtitle={contextTile?.domain}
      items={menuItems}
      onclose={closeContext}
      size={contextTile?.size}
      onresize={contextTile
        ? (size) => {
          if (contextTile)
            resizeTile(contextTile.id, size)
        }
        : undefined}
    />
  {/if}
  {#if dialog && snapshot}
    {#key JSON.stringify(dialog)}
      <Editor
        spec={dialog}
        {snapshot}
        oncommand={execute}
        onclose={() => (dialog = null)}
        onresetpreview={client.resetPreview
          ? async () => {
            applySnapshot(await client.resetPreview!())
            showNotice({ message: 'Sample bookmarks restored.' })
          }
          : undefined}
      />
    {/key}
  {/if}
  {#if notice}
    <UndoToast
      {notice}
      onundo={undo ? () => performUndo(undo.id) : undefined}
      onclose={() => (notice = null)}
    />
  {/if}
</div>

<style>
  .is-dragging :global(.snapgrid-item:not([data-dragging]) .metro-tile) {
    transform: scale(.93);
    opacity: .85;
  }
  .is-dragging :global(.snapgrid-item[data-dragging]) {
    z-index: 10;
  }
  .is-dragging :global(.snapgrid-item[data-dragging] .metro-tile) {
    transform: scale(1.04);
    opacity: .95;
    box-shadow: 0 10px 30px #0007;
  }
  .reduced .is-dragging :global(.snapgrid-item .metro-tile) {
    transform: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .is-dragging :global(.snapgrid-item .metro-tile) {
      transform: none;
    }
  }
</style>

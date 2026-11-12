<script lang='ts'>
  import type { DialogSpec } from '$lib/components/editor/dialog-spec'
  import type { ThemeMode } from '$lib/theme-picker'
  import type {
    Client,
    Command,
    GroupView,
    Layout,
    Notice,
    Snapshot,
    TileSize,
  } from '$lib/types'
  import Background from '$lib/components/Background.svelte'
  import Editor from '$lib/components/Editor.svelte'
  import SettingsDialog from '$lib/components/editor/SettingsDialog.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import IconButton from '$lib/components/IconButton.svelte'
  import ImageBackground from '$lib/components/ImageBackground.svelte'
  import MenuItems from '$lib/components/MenuItems.svelte'
  import MetroAppBar from '$lib/components/MetroAppBar.svelte'
  import MetroGroup from '$lib/components/MetroGroup.svelte'
  import RootsNav from '$lib/components/RootsNav.svelte'
  import TileSizeGrid from '$lib/components/TileSizeGrid.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import UndoToast from '$lib/components/UndoToast.svelte'
  import WorkspaceFooter from '$lib/components/WorkspaceFooter.svelte'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { isMediaKey } from '$lib/image-background'
  import { toggleSelection } from '$lib/interaction'
  import { GAP, reconcileLayout, ROWS } from '$lib/layout'
  import { sweepBackgroundMedia } from '$lib/media-store'
  import { focusFirstMenuItem } from '$lib/menu-focus'
  import {
    buildAppBarMenuItems,
    buildCanvasMenuItems,
    buildGroupMenuItems,
    buildTileMenuItems,
  } from '$lib/menus'
  import { getShader, NONE_SHADER_ID } from '$lib/shaders'
  import { shaderBenchmark } from '$lib/shaders/benchmark.svelte'
  import { applyThemeForMode, resetThemePreferences } from '$lib/theme-picker'
  import {
    flatten,
    indexTree,
    isBookmark,
    projectGroups,
  } from '$lib/tree'
  import { cn } from '$lib/utils'
  import { setWorkspace } from '$lib/workspace-context'
  import { SnapGridGroup } from '@snapgridjs/svelte'
  import { mode, ModeWatcher, theme } from 'mode-watcher'
  import { onMount } from 'svelte'
  import { MediaQuery } from 'svelte/reactivity'

  const { client }: { client: Client } = $props()
  let snapshot = $state.raw<Snapshot | null>(null)
  // Plain guard: the media sweep runs once per page load, not on every snapshot.
  let sweptMedia = false
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
  // Shift+F10 and the menu key produce a contextmenu whose coordinates still point
  // at the last mouse position, so the keyboard origin must be tracked separately.
  let kbMenu = false
  let busy = $state(false)
  let now = $state(Date.now())
  let viewportHeight = $state(800)
  let scroller = $state<HTMLElement | null>(null)
  let searchInput = $state<HTMLInputElement | null>(null)
  let scrollProgress = $state(0)
  let canScroll = $state(false)
  let activeGroup = $state(0)
  /** Group id briefly outlined after an activation scrolled it into view. */
  let flashGroup = $state<string | null>(null)
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  let draftLayouts = $state.raw<Record<string, Layout>>({})
  let layoutTimer: ReturnType<typeof setTimeout> | undefined
  let gestureTimer: ReturnType<typeof setTimeout> | undefined
  let dialog = $state<DialogSpec | null>(null)
  let menuTarget = $state<{
    target: 'tile' | 'canvas'
    id: string
  } | null>(null)
  let menuOpen = $state(false)
  let menuContentEl = $state<HTMLDivElement | null>(null)
  /** Element to refocus when the context menu closes. */
  let menuOrigin: HTMLElement | null = null
  let notice = $state<Notice | null>(null)
  let noticeUntil = $state(0)

  const groups = $derived(snapshot ? projectGroups(snapshot) : [])
  const allTiles = $derived(
    Object.fromEntries(groups.flatMap(group => Object.entries(group.tiles))),
  )
  const selectedTile = $derived(selectedId ? allTiles[selectedId] : undefined)
  const contextTile = $derived(
    menuTarget?.target === 'tile' ? allTiles[menuTarget.id] : undefined,
  )
  const nodes = $derived(indexTree(snapshot?.tree ?? []))
  const backgroundColor = $derived.by(() => {
    if (
      snapshot?.settings.background.type !== 'color'
      || snapshot.settings.background.auto !== false
    ) {
      return undefined
    }
    return snapshot.settings.background.color
  })
  const shaderBackground = $derived(
    snapshot?.settings.background.type === 'shader' ? snapshot.settings.background : undefined,
  )
  const liveShader = $derived.by(() => {
    const bg = shaderBackground
    if (!bg)
      return undefined
    const id = bg.shaderId ?? NONE_SHADER_ID
    if (id === NONE_SHADER_ID)
      return undefined
    return getShader(id)
  })
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
        snapshot?.settings.density === 'compact' ? 54 : 56,
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
          const matchesTile = `${tile.title} ${tile.kind === 'bookmark' ? tile.url : ''}`
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
              url: tile.kind === 'bookmark' ? tile.url : undefined,
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
  const settingsOpen = $derived(snapshot !== null && dialog?.kind === 'settings')
  const osReducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)')
  const reducedMotion = $derived(
    snapshot?.settings.reducedMotion || osReducedMotion.current,
  )
  // Workspace state for the canvas subtree (tiles read it via context). The getter
  // closure keeps consumers reactive without drilling props.
  setWorkspace(() => ({ dragging, selectedId, reducedMotion }))

  function applySnapshot(value: Snapshot) {
    snapshot = value
    // Reclaim background-media blobs that are no longer referenced (orphans
    // from a factory reset land here on the next page load). Once per session.
    if (!sweptMedia) {
      sweptMedia = true
      const background = value.settings.background
      const referenced = background.type === 'image' && isMediaKey(background.url ?? '')
        ? [background.url]
        : []
      sweepBackgroundMedia(referenced).catch((error) => {
        console.warn('[media] Unable to sweep orphaned background media.', error)
      })
    }
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
      if (command.type === 'factory.reset') {
        clearTimeout(layoutTimer)
        draftLayouts = {}
        try {
          resetThemePreferences()
        }
        catch (error) {
          // The stored bookmark data is already reset. Theme changes are best-effort.
          console.error('Theme reset failed:', error)
        }
      }
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
      clearTimeout(flashTimer)
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

  function selectRoot(id: string) {
    rootFilter = id
    cancelSmoothScroll()
    scroller?.scrollTo({ left: 0 })
  }
  /**
   * Folder tiles never launch; they pan the canvas to the folder's own group and
   * outline it briefly (Windows Explorer-style "open" without leaving the page).
   * Filters are reset first so the target group is always rendered.
   */
  function activateFolder(id: string) {
    if (rootFilter !== 'all')
      rootFilter = 'all'
    if (query)
      query = ''
    // Wait for the unfiltered canvas to render before locating the group.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const element = scroller?.querySelector<HTMLElement>(`[data-group-id="${CSS.escape(id)}"]`)
      if (!element || !scroller)
        return
      cancelSmoothScroll()
      scroller.scrollTo({
        left: Math.max(0, element.offsetLeft - 68),
        behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth',
      })
      flashGroup = id
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => (flashGroup = null), 4000)
    }))
  }
  function handleSearch() {
    if (query.trim())
      clearSelection()
  }
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
  /** Right-click, the menu key, or Shift+F10 on a writable tile marks it selected (uwp8 p. 158). */
  function selectTile(event: MouseEvent, id: string) {
    // preventDefault also keeps the canvas context menu closed (bits-ui honors it).
    event.preventDefault()
    const target = event.target instanceof Element ? event.target : null
    selectionOrigin = target?.closest<HTMLElement>('a, button') ?? null
    // Right-click always shows the commands for the tile it was pressed on; the
    // cross-slide gesture is what cancels a selection (uwp8 pp. 81-82).
    const keyboard = kbMenu || (event.clientX === 0 && event.clientY === 0)
    kbMenu = false
    selectedId = id
    // Marking an item also gives it focus, so Escape can hand focus back.
    selectionOrigin?.focus({ preventScroll: true })
    if (keyboard)
      focusRequest += 1
  }
  /** Canvas handler first, then bits-ui's handler (it opens the menu and honors preventDefault). */
  function forwardContextMenu(props: Record<string, unknown>, event: MouseEvent) {
    handleContextMenu(event)
    const triggerContextMenu = props.oncontextmenu
    if (typeof triggerContextMenu === 'function')
      Reflect.apply(triggerContextMenu, undefined, [event])
  }
  /**
   * Single contextmenu entry point on the canvas. Writable tiles select instead of
   * opening a menu (uwp8 p. 158); everything else opens the canvas/tile context menu.
   */
  function handleContextMenu(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element))
      return
    const tileEl = target.closest<HTMLElement>('[data-grid-id], [data-tile-id]')
    if (tileEl) {
      const id = tileEl.dataset.gridId ?? tileEl.dataset.tileId
      const tile = id ? allTiles[id] : undefined
      if (id && tile?.writable) {
        selectTile(event, id)
        return
      }
      kbMenu = false
      if (id) {
        // Unsupported tiles stay launchable via commands, not selection (p. 160).
        menuTarget = { target: 'tile', id }
        menuOrigin = tileEl.closest<HTMLElement>('a, button') ?? tileEl
        return
      }
    }
    kbMenu = false
    const grid = target.closest<HTMLElement>('[data-testid="metro-grid"]')
    menuTarget = { target: 'canvas', id: grid?.dataset.groupId ?? defaultFolder() }
    menuOrigin = grid ?? scroller
  }
  /** Return focus to the element that was right-clicked (or focused for Shift+F10). */
  function handleMenuCloseAutoFocus(event: Event) {
    if (!menuOrigin)
      return
    event.preventDefault()
    menuOrigin.focus({ preventScroll: true })
  }
  /** Cross-slide selection from a touch or pen gesture (uwp8 pp. 79-80). */
  function selectByGesture(id: string, event: PointerEvent) {
    const target = event.target instanceof Element ? event.target : null
    selectionOrigin = target?.closest<HTMLElement>('a, button') ?? null
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
    if (keyboard)
      selectionOrigin?.focus({ preventScroll: true })
    selectionOrigin = null
  }
  function canvasPointerDown(event: PointerEvent) {
    if (dragging)
      return
    // Activating a tile opens it; pressing anywhere else drops the selection (p. 82).
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('[data-grid-id], [data-tile-id]'))
      return
    clearSelection()
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
    const tile = allTiles[id]
    if (tile?.kind !== 'bookmark')
      return
    const url = tile.url
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
  const menuCallbacks = {
    open,
    edit,
    copy,
    execute,
    clearSelection,
    focusSearch: () => searchInput?.focus(),
  }
  const menuItems = $derived(
    menuTarget?.target === 'tile'
      ? buildTileMenuItems(contextTile, menuCallbacks)
      : menuTarget?.target === 'canvas'
      ? buildCanvasMenuItems({
        groups,
        selectedId,
        contextId: menuTarget.id,
        defaultFolder: defaultFolder(),
        shaderActive: snapshot?.settings.background.type === 'shader',
        imageActive: snapshot?.settings.background.type === 'image'
          && snapshot.settings.background.url !== '',
        callbacks: menuCallbacks,
      })
      : [],
  )
  interface MenuHeading {
    title: string
    subtitle?: string
  }
  /** Accessible/domain line for menus and the app bar; folders are labeled 'Folder'. */
  function tileSubtitle(tile: typeof contextTile): string | undefined {
    if (!tile)
      return undefined
    return tile.kind === 'folder' ? 'Folder' : tile.domain
  }
  const menuHeading = $derived<MenuHeading>(
    menuTarget?.target === 'tile'
      ? { title: contextTile?.title ?? 'Your canvas', subtitle: tileSubtitle(contextTile) }
      : { title: 'Your canvas' },
  )
  // Commands that stay off the app bar itself live in a menu opened from one of
  // its buttons (uwp8 p. 157), so they are not duplicated as bar commands.
  const appBarMenuItems = $derived(
    buildAppBarMenuItems(selectedTile, menuCallbacks),
  )
  function resizeTile(id: string, size: TileSize) {
    void execute({ type: 'tile.appearance', id, patch: { size } })
  }
  function stageLayout(id: string, layout: Layout) {
    draftLayouts = { ...draftLayouts, [id]: layout }
    clearTimeout(layoutTimer)
    // Source and destination callbacks belong to one gesture. Never treat
    // source removal as deletion.
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
    if (menuOpen)
      menuOpen = false
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
      ...scroller.querySelectorAll<HTMLElement>('[data-testid="metro-group"]'),
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
      = scroller?.querySelectorAll<HTMLElement>('[data-testid="metro-group"]')[index]
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
    // Another layer (e.g. a menus's Escape/keyboard handling) already handled this key.
    if (event.defaultPrevented)
      return
    const input
      = event.target instanceof Element
        && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)
    // The browser fires contextmenu for these keys; mark it as keyboard-driven.
    if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu')
      kbMenu = true
    // Menus are self-contained while open (Escape/Tab/arrows); leave them alone.
    const inMenu
      = document.activeElement instanceof Element
        && document.activeElement.closest('[role="menu"]') !== null
    if (menuOpen || inMenu)
      return
    if (dialog) {
      // Settings is a non-modal drawer, so Escape is its keyboard close action.
      if (dialog.kind === 'settings' && event.key === 'Escape') {
        event.preventDefault()
        dialog = null
      }
      return
    }
    if (
      !input
      && (event.key === '/'
        || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'))
    ) {
      event.preventDefault()
      searchInput?.focus()
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
  synchronousModeChanges
/>
<span
  bind:this={themeColorProbe}
  class='pointer-events-none fixed hidden size-px bg-(--background)'
  aria-hidden='true'
>
</span>
<div id='shell' class='flex h-full overflow-hidden'>
  <div
    class='
      relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden text-(--foreground)
    '
    class:reduced={snapshot?.settings.reducedMotion}
    style:background={backgroundColor}
  >
    {#if liveShader && shaderBackground && snapshot}
      <Background
        shader={liveShader}
        reducedMotion={snapshot.settings.reducedMotion}
        animated={!shaderBenchmark.running}
        color={shaderBackground.auto === false ? shaderBackground.color : undefined}
        speed={shaderBackground.speed ?? 1}
        targetFps={shaderBackground.targetFps ?? 60}
        quality={shaderBackground.quality ?? 'motion'}
        opacity={shaderBackground.opacity ?? 1}
        mouseInteraction={shaderBackground.mouseInteraction ?? true}
        renderScale={shaderBackground.renderScale ?? 0.5}
        onstruggle={() => showNotice({
          message: 'Animated background paused to keep this page fast.',
          actionLabel: 'Turn off',
        })}
      />
    {:else if snapshot?.settings.background.type === 'image'}
      <ImageBackground
        src={snapshot.settings.background.url}
        color={snapshot.settings.background.auto === false
          ? snapshot.settings.background.color
          : undefined}
        fit={snapshot.settings.background.fit ?? 'cover'}
        opacity={snapshot.settings.background.opacity ?? 1}
        parallax={snapshot.settings.background.parallax ?? false}
        parallaxZoom={snapshot.settings.background.parallaxZoom ?? 1.5}
        scrollProgress={scrollProgress}
        reducedMotion={snapshot.settings.reducedMotion}
        onerror={() => showNotice({
          message: 'The background image could not be loaded.',
          actionLabel: 'Turn off',
        })}
      />
    {/if}

    <header class='shrink-0 px-16 pt-8 max-lg:px-9 max-md:px-6 max-md:pt-6'>
      <div class='flex items-center justify-between gap-5 pb-3.5 max-sm:pb-2.5'>
        <RootsNav
          {roots}
          {rootFilter}
          {bookmarkCount}
          onSelect={selectRoot}
        />
      </div>
    </header>

    {#snippet groupMenu(group: GroupView)}
      <MenuItems
        variant='dropdown'
        items={buildGroupMenuItems({
          node: nodes.get(group.id),
          group,
          callbacks: menuCallbacks,
        })}
      />
    {/snippet}

    <!-- Canvas right-click opens the canvas menu (add bookmark/folder, settings). -->
    <ContextMenu.Root bind:open={menuOpen}>
      <ContextMenu.Trigger>
        {#snippet child({ props })}
          <main
            {...props}
            id='canvas'
            class='
              relative min-h-0 flex-1 scrollbar-none overflow-auto scroll-smooth
              outline-none
              [&::-webkit-scrollbar]:hidden
            '
            bind:this={scroller}
            onscroll={updateScroll}
            onwheel={wheel}
            onpointerdown={canvasPointerDown}
            oncontextmenu={event => forwardContextMenu(props, event)}
            aria-label='Bookmark tile canvas'
            tabindex='-1'
          >
            <div class='flex h-full flex-row items-center'>
              {#if !snapshot}
                <div
                  class='
                    flex size-full min-h-60 flex-col items-center justify-center
                    text-center text-(--muted-foreground)
                  '
                >
                  {#if loadError}
                    <Icon name='lock' size={28} />
                    <h2
                      class={cn(`
                        mt-5 mb-2.5 text-2xl font-normal tracking-tight
                        text-(--foreground)
                      `)}
                    >
                      Let's reconnect.
                    </h2>
                    <p class='mb-6 px-5 text-xs/relaxed'>{loadError}</p>
                    <button onclick={() => window.location.reload()}>
                      Reload page
                    </button>
                  {:else}
                    <span
                      class='
                        mb-5 size-6 animate-spin rounded-full border border-(--border)
                        border-t-(--primary)
                      '
                    >
                    </span>
                    <p class='mb-6 px-5 text-xs/relaxed'>
                      Finding your favorites…
                    </p>
                  {/if}
                </div>
              {:else if normalizedQuery && !visibleGroups.length}
                <div class={cn(`flex size-full min-h-60 flex-col items-center justify-center border`)}>
                  <Icon name='searchBookmarks' size={33} />
                  <h2 class={cn(`mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--foreground)`)}>
                    No favorites found.
                  </h2>
                  <p class='mb-6 px-5 text-xs/relaxed'>
                    Nothing matches “{query}”. Try a title, website, or folder.
                  </p>
                  <Button onclick={() => (query = '')}>Clear search</Button>
                </div>
              {:else}
                <SnapGridGroup>
                  <div
                    class='
                      flex h-fit w-max items-end gap-9 px-16
                      max-lg:gap-7 max-lg:px-9
                      max-md:px-6
                    '
                  >
                    {#each visibleGroups as group (group.id)}
                      <MetroGroup
                        {group}
                        layout={draftLayouts[group.id] ?? group.layout}
                        tiles={allTiles}
                        {cell}
                        draggable={!normalizedQuery}
                        showDomains={snapshot.settings.showDomains}
                        preview={client.mode === 'preview'}
                        onLayoutChange={stageLayout}
                        onDragStart={() => {
                          dragging = true
                          // A tile moving between groups must not keep the app bar (uwp8 p. 82).
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
                        onActivateFolder={activateFolder}
                        flash={flashGroup === group.id}
                        onResizeTile={resizeTile}
                        menu={groupMenu}
                        onAdd={parentId => edit({ kind: 'bookmark', parentId })}
                        onBlocked={message => showNotice({ message, tone: 'error' })}
                      />
                    {/each}
                    {#if !visibleGroups.length && !normalizedQuery}
                      <div
                        class='
                          flex size-full min-h-60 flex-col items-center justify-center
                          text-center text-(--muted-foreground)
                        '
                      >
                        <h2
                          class={cn(`
                            mt-5 mb-2.5 text-2xl font-normal tracking-tight
                            text-(--foreground)
                          `)}
                        >
                          No bookmark folders available.
                        </h2>
                        <p class='mb-6 px-5 text-xs/relaxed'>
                          Create a writable browser bookmark folder to get started.
                        </p>
                      </div>{/if}
                  </div>
                </SnapGridGroup>
              {/if}
            </div>
          </main>
        {/snippet}
      </ContextMenu.Trigger>
      <ContextMenu.Content
        bind:ref={menuContentEl}
        class='w-65'
        aria-label={menuTarget?.target === 'tile'
          ? `Actions for ${contextTile?.title ?? 'tile'}`
          : 'Canvas actions'}
        onOpenAutoFocus={event => focusFirstMenuItem(event, menuContentEl)}
        onCloseAutoFocus={handleMenuCloseAutoFocus}
      >
        <ContextMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
          <strong class='truncate text-[12px] font-semibold'>{menuHeading.title}</strong>
          {#if menuHeading.subtitle}
            <span class='truncate text-[12px] text-(--muted-foreground)'>{menuHeading.subtitle}</span>
          {/if}
        </ContextMenu.Label>
        <MenuItems items={menuItems} variant='context' />
        {#if contextTile}
          <TileSizeGrid
            size={contextTile.size}
            onresize={size => resizeTile(contextTile.id, size)}
          />
        {/if}
      </ContextMenu.Content>
    </ContextMenu.Root>

    <WorkspaceFooter
      bind:query
      bind:searchInput
      {bookmarkCount}
      {folderCount}
      {visibleGroups}
      {activeGroup}
      {canScroll}
      {scrollProgress}
      preview={client.mode === 'preview'}
      {busy}
      onSearch={handleSearch}
      onJump={jump}
      onScroll={scroll}
    />
    {#if selectedTile && !dragging}
      <MetroAppBar
        title={selectedTile.title}
        subtitle={tileSubtitle(selectedTile)}
        size={selectedTile.size}
        writable={selectedTile.writable}
        kind={selectedTile.kind}
        {focusRequest}
        menuItems={appBarMenuItems}
        onresize={size => resizeTile(selectedTile.id, size)}
        onedit={selectedTile.kind === 'folder'
          ? () => edit({ kind: 'rename', id: selectedTile.id })
          : () => edit({ kind: 'bookmark', id: selectedTile.id })}
        onmove={() => edit({ kind: 'move', id: selectedTile.id })}
        ondelete={selectedTile.kind === 'folder'
          ? undefined
          : () => {
            void execute({ type: 'node.remove', id: selectedTile.id })
          }}
        onclear={clearSelection}
      />
    {/if}
    {#if dialog && snapshot && dialog.kind !== 'settings'}
      {#key JSON.stringify(dialog)}
        <Editor
          spec={dialog}
          {snapshot}
          oncommand={execute}
          onclose={() => (dialog = null)}
        />
      {/key}
    {/if}
    {#if notice}
      <UndoToast
        {notice}
        onundo={undo
          ? () => performUndo(undo.id)
          : notice.actionLabel
          ? () => {
            void execute({
              type: 'settings.update',
              patch: { background: { ...BACKGROUND_DEFAULTS.color } },
            })
          }
          : undefined}
        onclose={() => (notice = null)}
      />
    {/if}
  </div>
  <aside
    class={[
      `flex h-dvh w-(--settings-width) shrink-0 flex-col overflow-hidden
      border-l border-(--border) bg-(--card) text-(--foreground) shadow-(--shadow)
      transition-[margin-right,opacity] duration-300
      will-change-[margin-right,opacity] motion-reduce:transition-none`,
      !settingsOpen && '-mr-(--settings-width) opacity-0 pointer-events-none',
    ].filter(Boolean).join(' ')}
    style='--settings-width: min(32rem, calc(100vw - 24px))'
    aria-label='Settings'
    aria-hidden={!settingsOpen}
    inert={!settingsOpen}
  >
    {#if snapshot}

      <header
        class='
          flex shrink-0 items-start justify-between gap-2.5 border-b border-(--border)
          px-7.5 pt-7.25 pb-5
        '
      >
        <div>
          <div class='mb-2 text-[0.5rem] tracking-[1.7px] text-(--muted-foreground)'>
            MAKE YOURSELF AT HOME
          </div>
          <h2 class='m-0 text-2xl font-[450] tracking-[-1px]'>
            Settings
          </h2>
        </div>
        <IconButton
          class='-mr-1.75'
          label='Close settings'
          onclick={() => (dialog = null)}
        >
          <Icon name='close' size={18} />
        </IconButton>
      </header>
      <div
        class='
          min-h-0 flex-1 scrollbar-thin scrollbar-gutter-stable overflow-auto px-7.5
          pt-6.5 pb-7.5
          max-[480px]:p-6
        '
      >
        <SettingsDialog
          settings={snapshot.settings}
          oncommand={execute}
          onclose={() => (dialog = null)}
          onresetpreview={client.resetPreview
            ? async () => {
              applySnapshot(await client.resetPreview!())
              showNotice({ message: 'Sample bookmarks restored.' })
            }
            : undefined}
        />
      </div>
    {/if}
  </aside>

</div>

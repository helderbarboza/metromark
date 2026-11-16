<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type {
    Client,
    Command,
    GroupView,
    Notice,
    Snapshot,
    TileSize,
  } from '$lib/types'
  import { isMediaKey } from '$lib/background-image'
  import MenuItems from '$lib/components/molecules/MenuItems.svelte'
  import UndoToast from '$lib/components/molecules/UndoToast.svelte'
  import WorkspaceFooter from '$lib/components/molecules/WorkspaceFooter.svelte'
  import CanvasContextMenu from '$lib/components/organisms/CanvasContextMenu.svelte'
  import Editor from '$lib/components/organisms/Editor.svelte'
  import MetroAppBar from '$lib/components/organisms/MetroAppBar.svelte'
  import PageBackground from '$lib/components/organisms/PageBackground.svelte'
  import RootsNav from '$lib/components/organisms/RootsNav.svelte'
  import SettingsDrawer from '$lib/components/organisms/SettingsDrawer.svelte'
  import ThemeSync from '$lib/components/ThemeSync.svelte'
  import * as Tooltip from '$lib/components/ui/tooltip'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { toggleSelection } from '$lib/interaction'
  import { KeyboardNav } from '$lib/keyboard-nav'
  import { GAP, ROWS } from '$lib/layout'
  import { LayoutStager } from '$lib/layout-stager.svelte'
  import { sweepBackgroundMedia } from '$lib/media-store'
  import {
    buildAppBarMenuItems,
    buildCanvasMenuItems,
    buildGroupMenuItems,
    buildTileMenuItems,
  } from '$lib/menus'
  import { SmoothScroller } from '$lib/smooth-scroll.svelte'
  import { resetThemePreferences } from '$lib/theme-picker'
  import {
    flatten,
    indexTree,
    isBookmark,
    projectGroups,
  } from '$lib/tree'
  import { filterVisibleGroups } from '$lib/visible-groups'
  import { setWorkspace } from '$lib/workspace-context'
  import { onMount } from 'svelte'
  import { MediaQuery } from 'svelte/reactivity'
  import { fly } from 'svelte/transition'

  const { client }: { client: Client } = $props()
  let snapshot = $state.raw<Snapshot | null>(null)
  // Plain guard: the media sweep runs once per page load, not on every snapshot.
  let sweptMedia = false
  let loadError = $state('')
  let query = $state('')
  let rootFilter = $state('all')
  let dragging = $state(false)
  // Single selection for now: selection is marking without launching, and
  // `toggleSelection` is the one place a future multi-select
  // (selection basket) has to change.
  let selectedId = $state<string | null>(null)
  let selectionOrigin = $state<HTMLElement | null>(null)
  let focusRequest = $state(0)
  let busy = $state(false)
  let now = $state(Date.now())
  let viewportHeight = $state(800)
  let scroller = $state<HTMLElement | null>(null)
  let searchInput = $state<HTMLInputElement | null>(null)
  /** Group id briefly outlined after an activation scrolled it into view. */
  let flashGroup = $state<string | null>(null)
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  const layoutStager = new LayoutStager(execute)
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
  const smoothScroll = new SmoothScroller({
    getScroller: () => scroller,
    isReducedMotion: () => snapshot?.settings.reducedMotion ?? false,
    isMenuOpen: () => menuOpen,
    closeMenu: () => {
      menuOpen = false
    },
  })
  const keyboardNav = new KeyboardNav({
    isMenuOpen: () => menuOpen,
    getDialog: () => dialog,
    closeDialog: () => {
      dialog = null
    },
    getQuery: () => query,
    clearQuery: () => {
      query = ''
    },
    getUndos: () => snapshot?.undos ?? [],
    getNow: () => now,
    isDragging: () => dragging,
    onUndo: performUndo,
    clearSelection,
    focusSearch: () => searchInput?.focus(),
  })

  const groups = $derived(snapshot ? projectGroups(snapshot) : [])
  const allTiles = $derived(
    Object.fromEntries(groups.flatMap(group => Object.entries(group.tiles))),
  )
  const selectedTile = $derived(selectedId ? allTiles[selectedId] : undefined)
  const contextTile = $derived(
    menuTarget?.target === 'tile' ? allTiles[menuTarget.id] : undefined,
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
        snapshot?.settings.density === 'compact' ? 54 : 56,
        Math.floor((viewportHeight - 279 - (ROWS - 1) * GAP) / ROWS),
      ),
    ),
  )
  const normalizedQuery = $derived(query.trim().toLowerCase())
  const visibleGroups = $derived(
    filterVisibleGroups(groups, rootFilter, normalizedQuery, snapshot?.appearance),
  )
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
  const originalFavicons = $derived(snapshot?.settings.originalFavicons ?? false)
  // Workspace state for the canvas subtree (tiles read it via context). The getter
  // closure keeps consumers reactive without drilling props.
  setWorkspace(() => ({ dragging, selectedId, reducedMotion, originalFavicons }))

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
        layoutStager.reset()
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
      smoothScroll.updateScroll()
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
      layoutStager.reset()
      clearTimeout(gestureTimer)
      clearTimeout(flashTimer)
      smoothScroll.cancelSmoothScroll()
    }
  })
  $effect(() => {
    if (notice && now >= noticeUntil)
      notice = null
  })
  $effect(() => {
    void visibleGroups
    void cell
    requestAnimationFrame(smoothScroll.updateScroll)
  })

  function selectRoot(id: string) {
    rootFilter = id
    smoothScroll.cancelSmoothScroll()
    scroller?.scrollTo({
      left: 0,
      behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth',
    })
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
      smoothScroll.cancelSmoothScroll()
      scroller.scrollTo({
        left: Math.max(0, element.offsetLeft - 68),
        behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth',
      })
      flashGroup = id
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => (flashGroup = null), 1000)
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
  /** Right-click, the menu key, or Shift+F10 on a writable tile marks it selected. */
  function selectTile(event: MouseEvent, id: string) {
    // preventDefault also keeps the canvas context menu closed (bits-ui honors it).
    event.preventDefault()
    const target = event.target instanceof Element ? event.target : null
    selectionOrigin = target?.closest<HTMLElement>('a, button') ?? null
    // Right-click always shows the commands for the tile it was pressed on; the
    // cross-slide gesture is what cancels a selection.
    const keyboard = keyboardNav.kbMenu || (event.clientX === 0 && event.clientY === 0)
    keyboardNav.kbMenu = false
    selectedId = id
    // Marking an item also gives it focus, so Escape can hand focus back.
    selectionOrigin?.focus({ preventScroll: true })
    if (keyboard)
      focusRequest += 1
  }
  /**
   * Suppress the browser's native context menu in the whole app. The app opens
   * its own menus and selects tiles on right-click. Editable fields keep the
   * native menu so cut, copy, paste, and spellcheck stay available.
   */
  function blockNativeContextMenu(event: MouseEvent) {
    const target = event.target
    if (target instanceof Element
      && target.closest('input, textarea, [contenteditable="true"]')) {
      return
    }
    event.preventDefault()
  }
  /** Canvas handler first, then bits-ui's handler (it opens the menu and honors preventDefault). */
  function forwardContextMenu(props: Record<string, unknown>, event: MouseEvent) {
    // The group header owns its own context menu; swallow the event here.
    if (event.target instanceof Element
      && event.target.closest('[data-testid="group-header"]')) {
      event.preventDefault()
      return
    }
    handleContextMenu(event)
    const triggerContextMenu = props.oncontextmenu
    if (typeof triggerContextMenu === 'function')
      Reflect.apply(triggerContextMenu, undefined, [event])
  }
  /**
   * Single contextmenu entry point on the canvas. Writable tiles select instead of
   * opening a menu; everything else opens the canvas/tile context menu.
   */
  function handleContextMenu(event: MouseEvent) {
    const target = event.target
    // The group header owns its own context menu; never let the canvas menu
    // open alongside it (or instead of it, depending on event-ordering).
    if (target instanceof Element && target.closest('[data-testid="group-header"]'))
      return
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
      keyboardNav.kbMenu = false
      if (id) {
        // Unsupported tiles stay launchable via commands, not selection (p. 160).
        menuTarget = { target: 'tile', id }
        menuOrigin = tileEl.closest<HTMLElement>('a, button') ?? tileEl
        return
      }
    }
    // The group header handles its own right-click with its own context menu.
    if (event.defaultPrevented)
      return
    keyboardNav.kbMenu = false
    const grid = target.closest<HTMLElement>('[data-testid="metro-grid"]')
    if (grid) {
      menuTarget = { target: 'canvas', id: grid.dataset.groupId ?? defaultFolder() }
      menuOrigin = grid
      return
    }
    menuTarget = { target: 'canvas', id: defaultFolder() }
    menuOrigin = scroller
  }
  /** Return focus to the element that was right-clicked (or focused for Shift+F10). */
  function handleMenuCloseAutoFocus(event: Event) {
    if (!menuOrigin)
      return
    event.preventDefault()
    menuOrigin.focus({ preventScroll: true })
  }
  /** Cross-slide selection from a touch or pen gesture. */
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
      : buildCanvasMenuItems({
        groups,
        selectedId,
        contextId: menuTarget?.id ?? '',
        defaultFolder: defaultFolder(),
        shaderActive: snapshot?.settings.background.type === 'shader',
        imageActive: snapshot?.settings.background.type === 'image'
          && snapshot.settings.background.url !== '',
        callbacks: menuCallbacks,
      }),
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
  // its buttons, so they are not duplicated as bar commands.
  const appBarMenuItems = $derived(
    buildAppBarMenuItems(selectedTile, menuCallbacks),
  )
  function resizeTile(id: string, size: TileSize) {
    void execute({ type: 'tile.appearance', id, patch: { size } })
  }
  function canvasDragStart() {
    dragging = true
    // A tile moving between groups must not keep the app bar.
    selectedId = null
    selectionOrigin = null
    // An in-flight smooth scroll would fight the drag and keep the canvas
    // moving under the pointer, so stop it and hold scrolling still.
    smoothScroll.cancelSmoothScroll()
    if (scroller)
      scroller.style.scrollBehavior = 'auto'
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
  function performUndo(id: string) {
    if (snapshot?.undos.find(entry => entry.id === id)?.needsDestination)
      edit({ kind: 'restore', undoId: id })
    else void execute({ type: 'undo', id })
  }
</script>

<svelte:window onkeydown={keyboardNav.handleKey} oncontextmenu={blockNativeContextMenu} />
<ThemeSync />
<Tooltip.Provider>
  <div id='shell' class='flex h-full overflow-hidden'>
    <div
      class='
        relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden text-(--foreground)
      '
      class:reduced={snapshot?.settings.reducedMotion}
    >
      {#if snapshot}
        <PageBackground
          background={snapshot.settings.background}
          {reducedMotion}
          scrollProgress={smoothScroll.scrollProgress}
          onstruggle={() => showNotice({
            message: 'Animated background paused to keep this page fast.',
            actionLabel: 'Turn off',
          })}
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
          variant='context'
          items={buildGroupMenuItems({
            node: nodes.get(group.id),
            group,
            callbacks: menuCallbacks,
          })}
        />
      {/snippet}

      <CanvasContextMenu
        bind:open={menuOpen}
        bind:scroller
        bind:contentEl={menuContentEl}
        {snapshot}
        {loadError}
        {normalizedQuery}
        {visibleGroups}
        {cell}
        tiles={allTiles}
        {layoutStager}
        {smoothScroll}
        {flashGroup}
        preview={client.mode === 'preview'}
        {query}
        onClearSearch={() => (query = '')}
        onDragStart={canvasDragStart}
        onDragStop={dragStop}
        onSelect={selectByGesture}
        onActivateFolder={activateFolder}
        onResizeTile={resizeTile}
        {groupMenu}
        onAdd={parentId => edit({ kind: 'bookmark', parentId })}
        onBlocked={message => showNotice({ message, tone: 'error' })}
        onCanvasPointerDown={canvasPointerDown}
        onForwardContextMenu={forwardContextMenu}
        {menuTarget}
        {contextTile}
        {menuItems}
        {menuHeading}
        onCloseAutoFocus={handleMenuCloseAutoFocus}
      />

      <WorkspaceFooter
        bind:query
        bind:searchInput
        {bookmarkCount}
        {folderCount}
        {visibleGroups}
        activeGroup={smoothScroll.activeGroup}
        canScroll={smoothScroll.canScroll}
        scrollProgress={smoothScroll.scrollProgress}
        preview={client.mode === 'preview'}
        {busy}
        onSearch={handleSearch}
        onJump={smoothScroll.jump}
        onScroll={smoothScroll.scroll}
      />
      {#if selectedTile && !dragging}
        <div
          class='fixed inset-x-0 bottom-0 z-50'
          transition:fly={{ y: 64, duration: reducedMotion ? 0 : 200 }}
        >
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
        </div>
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
        <div
          class='fixed bottom-19.5 left-1/2 z-80 -translate-x-1/2'
          transition:fly={{ y: 16, duration: reducedMotion ? 0 : 180 }}
        >
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
        </div>
      {/if}
    </div>
    <SettingsDrawer
      open={settingsOpen}
      settings={snapshot?.settings}
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
</Tooltip.Provider>

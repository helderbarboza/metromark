<script lang='ts'>
  import type { LayoutStager } from '$lib/layout-stager.svelte'
  import type { MenuItem } from '$lib/menus'
  import type { SmoothScroller } from '$lib/smooth-scroll.svelte'
  import type { GroupView, Snapshot, TileSize, TileView } from '$lib/types'
  import type { Snippet } from 'svelte'
  import LL from '$i18n/i18n-svelte'
  import BoardStatus from '$lib/components/molecules/BoardStatus.svelte'
  import MenuItems from '$lib/components/molecules/MenuItems.svelte'
  import TileSizeGrid from '$lib/components/molecules/TileSizeGrid.svelte'
  import MetroGroup from '$lib/components/organisms/MetroGroup.svelte'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import { gridViewDef, tileSizesForView } from '$lib/layout'
  import { focusFirstMenuItem } from '$lib/menu-focus'
  import { SnapGridGroup } from '@snapgridjs/svelte'
  import { cn } from 'cn'
  import { tick } from 'svelte'
  import { MediaQuery } from 'svelte/reactivity'

  interface Props {
    /** Context menu open state (bindable). */
    open: boolean
    /** The board element (bindable). */
    scroller: HTMLElement | null
    /** The context-menu content element (bindable). */
    contentEl: HTMLDivElement | null
    snapshot: Snapshot | null
    loadError: string
    normalizedQuery: string
    visibleGroups: GroupView[]
    cell: number
    tiles: Record<string, TileView>
    layoutStager: LayoutStager
    smoothScroll: SmoothScroller
    flashGroup: string | null
    /** True in the web preview, false in the native extension. */
    preview: boolean
    query: string
    onClearSearch: () => void
    onDragStart: () => void
    onDragStop: () => void
    onSelect: (id: string, event: PointerEvent) => void
    onActivateFolder: (id: string) => void
    onResizeTile: (id: string, size: TileSize) => void
    /** Per-group context menu content, rendered by each MetroGroup header. */
    groupMenu: Snippet<[GroupView]>
    onAdd: (parentId: string) => void
    onBlocked: (message: string) => void
    onBoardPointerDown: (event: PointerEvent) => void
    /** Intercepts the raw contextmenu event before bits-ui opens the menu. */
    onForwardContextMenu: (props: Record<string, unknown>, event: MouseEvent) => void
    menuTarget: { target: 'tile' | 'board', id: string } | null
    contextTile: TileView | undefined
    menuItems: MenuItem[]
    menuHeading: { title: string, subtitle?: string }
    onCloseAutoFocus: (event: Event) => void
  }

  let {
    open = $bindable(false),
    scroller = $bindable(null),
    contentEl = $bindable(null),
    snapshot,
    loadError,
    normalizedQuery,
    visibleGroups,
    cell,
    tiles,
    layoutStager,
    smoothScroll,
    flashGroup,
    preview,
    query,
    onClearSearch,
    onDragStart,
    onDragStop,
    onSelect,
    onActivateFolder,
    onResizeTile,
    groupMenu,
    onAdd,
    onBlocked,
    onBoardPointerDown,
    onForwardContextMenu,
    menuTarget,
    contextTile,
    menuItems,
    menuHeading,
    onCloseAutoFocus,
  }: Props = $props()

  const view = $derived(snapshot?.settings.gridView)
  const def = $derived(gridViewDef(view))
  const rows = $derived(def.rows)
  const sizes = $derived(tileSizesForView(view))
  const osReducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)')
  const reducedMotion = $derived(snapshot?.settings.reducedMotion || osReducedMotion.current)

  let containerEl = $state<HTMLDivElement | null>(null)
  let previousRect: DOMRect | null = null

  // FLIP the board container across view-mode switches: remember its position
  // before the wrapper classes change, then slide it into the new position.
  $effect.pre(() => {
    // Tracked read: capture the pre-change rect on every mode flip.
    void view
    previousRect = containerEl?.getBoundingClientRect() ?? null
  })
  $effect(() => {
    void view
    const el = containerEl
    const from = previousRect
    if (!el || !from)
      return
    void tick().then(() => {
      const dy = from.top - el.getBoundingClientRect().top
      if (reducedMotion || dy === 0)
        return
      el.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
        { duration: 150, easing: 'ease-out' },
      )
    })
  })
</script>

<!-- Board right-click opens the board menu (add bookmark/folder, settings). -->
<ContextMenu.Root bind:open>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <main
        {...props}
        id='board'
        class='
          relative min-h-0 flex-1 scrollbar-none overflow-auto outline-none
          [&::-webkit-scrollbar]:hidden
        '
        bind:this={scroller}
        onscroll={smoothScroll.closeMenuOnBoardScroll}
        onwheel={smoothScroll.wheel}
        onpointerdown={onBoardPointerDown}
        oncontextmenu={event => onForwardContextMenu(props, event)}
        aria-label={$LL.app.bookmarkBoard()}
        tabindex='-1'
      >
        <div
          class={cn('flex h-full flex-row', def.anchor === 'end' ? 'items-end' : 'items-center')}
          style:padding-bottom={def.anchor === 'end' ? `${def.inset ?? 0}px` : undefined}
        >
          {#if !snapshot}
            <BoardStatus variant='loading' {loadError} />
          {:else if normalizedQuery && !visibleGroups.length}
            <BoardStatus variant='no-results' {query} onclearsearch={onClearSearch} />
          {:else}
            <SnapGridGroup>
              <div
                bind:this={containerEl}
                class='
                  flex h-fit w-max items-end gap-9 px-40
                  max-lg:gap-7 max-lg:px-9
                  max-md:px-6
                '
              >
                {#each visibleGroups as group (group.id)}
                  <MetroGroup
                    {group}
                    layout={layoutStager.draftLayouts[group.id] ?? group.layout}
                    tiles={tiles}
                    {cell}
                    {rows}
                    draggable={!normalizedQuery}
                    showDomains={snapshot.settings.showDomains}
                    {preview}
                    onLayoutChange={layoutStager.stage}
                    onDragStart={onDragStart}
                    onDragStop={onDragStop}
                    onSelect={onSelect}
                    onActivateFolder={onActivateFolder}
                    flash={flashGroup === group.id}
                    onResizeTile={onResizeTile}
                    menu={groupMenu}
                    onAdd={onAdd}
                    onBlocked={onBlocked}
                  />
                {/each}
                {#if !visibleGroups.length && !normalizedQuery}
                  <BoardStatus variant='no-folders' />
                {/if}
              </div>
            </SnapGridGroup>
          {/if}
        </div>
      </main>
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content
    bind:ref={contentEl}
    class='w-65'
    aria-label={menuTarget?.target === 'tile'
      ? $LL.app.actionsFor({ title: contextTile?.title ?? $LL.app.tile() })
      : $LL.app.boardActions()}
    onOpenAutoFocus={event => focusFirstMenuItem(event, contentEl)}
    onCloseAutoFocus={onCloseAutoFocus}
  >
    <ContextMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
      <strong class='truncate text-xs font-semibold'>{menuHeading.title}</strong>
      {#if menuHeading.subtitle}
        <span class='truncate text-xs text-(--muted-foreground)'>{menuHeading.subtitle}</span>
      {/if}
    </ContextMenu.Label>
    <MenuItems items={menuItems} variant='context' />
    {#if contextTile}
      <TileSizeGrid
        size={contextTile.size}
        sizes={sizes}
        onresize={size => onResizeTile(contextTile.id, size)}
      />
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

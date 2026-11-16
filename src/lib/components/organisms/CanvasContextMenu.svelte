<script lang='ts'>
  import type { LayoutStager } from '$lib/layout-stager.svelte'
  import type { MenuItem } from '$lib/menus'
  import type { SmoothScroller } from '$lib/smooth-scroll.svelte'
  import type { GroupView, Snapshot, TileSize, TileView } from '$lib/types'
  import type { Snippet } from 'svelte'
  import CanvasStatus from '$lib/components/molecules/CanvasStatus.svelte'
  import MenuItems from '$lib/components/molecules/MenuItems.svelte'
  import TileSizeGrid from '$lib/components/molecules/TileSizeGrid.svelte'
  import MetroGroup from '$lib/components/organisms/MetroGroup.svelte'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import { focusFirstMenuItem } from '$lib/menu-focus'
  import { SnapGridGroup } from '@snapgridjs/svelte'

  interface Props {
    /** Context menu open state (bindable). */
    open: boolean
    /** The canvas element (bindable). */
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
    onCanvasPointerDown: (event: PointerEvent) => void
    /** Intercepts the raw contextmenu event before bits-ui opens the menu. */
    onForwardContextMenu: (props: Record<string, unknown>, event: MouseEvent) => void
    menuTarget: { target: 'tile' | 'canvas', id: string } | null
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
    onCanvasPointerDown,
    onForwardContextMenu,
    menuTarget,
    contextTile,
    menuItems,
    menuHeading,
    onCloseAutoFocus,
  }: Props = $props()
</script>

<!-- Canvas right-click opens the canvas menu (add bookmark/folder, settings). -->
<ContextMenu.Root bind:open>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <main
        {...props}
        id='canvas'
        class='
          relative min-h-0 flex-1 scrollbar-none overflow-auto outline-none
          [&::-webkit-scrollbar]:hidden
        '
        bind:this={scroller}
        onscroll={smoothScroll.closeMenuOnCanvasScroll}
        onwheel={smoothScroll.wheel}
        onpointerdown={onCanvasPointerDown}
        oncontextmenu={event => onForwardContextMenu(props, event)}
        aria-label='Bookmark tile canvas'
        tabindex='-1'
      >
        <div class='flex h-full flex-row items-center'>
          {#if !snapshot}
            <CanvasStatus variant='loading' {loadError} />
          {:else if normalizedQuery && !visibleGroups.length}
            <CanvasStatus variant='no-results' {query} onclearsearch={onClearSearch} />
          {:else}
            <SnapGridGroup>
              <div
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
                  <CanvasStatus variant='no-folders' />
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
      ? `Actions for ${contextTile?.title ?? 'tile'}`
      : 'Canvas actions'}
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
        onresize={size => onResizeTile(contextTile.id, size)}
      />
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

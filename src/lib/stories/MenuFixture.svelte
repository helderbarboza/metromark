<script lang='ts'>
  import type { MenuItem } from '$lib/menus'
  import type { TileSize } from '$lib/types'
  import MenuItems from '$lib/components/molecules/MenuItems.svelte'
  import TileSizeGrid from '$lib/components/molecules/TileSizeGrid.svelte'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { focusFirstMenuItem } from '$lib/menu-focus'

  /**
   * Fixture for menu stories: renders the exact composition the app uses,
   * either as a right-click context menu or an overflow dropdown.
   */
  interface Props {
    variant?: 'context' | 'dropdown'
    items: MenuItem[]
    headingTitle?: string
    headingSubtitle?: string
    /** When set, the context menu also shows the TILE SIZE preset row. */
    tileSize?: TileSize
    onresize?: (size: TileSize) => void
  }

  const {
    variant = 'context',
    items,
    headingTitle,
    headingSubtitle,
    tileSize,
    onresize,
  }: Props = $props()

  let contentEl = $state<HTMLDivElement | null>(null)
</script>

{#if variant === 'context'}
  <ContextMenu.Root>
    <ContextMenu.Trigger
      class='
        flex aspect-video w-64 items-center justify-center rounded-xl border border-dashed
        text-sm text-(--muted-foreground)
      '
    >
      Right click here
    </ContextMenu.Trigger>
    <ContextMenu.Content
      bind:ref={contentEl}
      class='w-65'
      onOpenAutoFocus={event => focusFirstMenuItem(event, contentEl)}
    >
      {#if headingTitle}
        <ContextMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
          <strong class='truncate text-xs font-semibold'>
            {headingTitle}
          </strong>
          {#if headingSubtitle}
            <span class='truncate text-xs text-(--muted-foreground)'>{headingSubtitle}</span>
          {/if}
        </ContextMenu.Label>
      {/if}
      <MenuItems {items} variant='context' />
      {#if tileSize && onresize}
        <TileSizeGrid size={tileSize} {onresize} />
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>
{:else}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      aria-label='More actions for Steam'
      class='
        inline-flex size-9.5 items-center justify-center rounded-full border
        text-(--muted-foreground)
        hover:bg-(--accent)
      '
    >
      <span aria-hidden='true'>⋮</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      bind:ref={contentEl}
      class='w-65'
      onOpenAutoFocus={event => focusFirstMenuItem(event, contentEl)}
    >
      {#if headingTitle}
        <DropdownMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
          <strong class='truncate text-xs font-semibold'>
            {headingTitle}
          </strong>
          {#if headingSubtitle}
            <span class='truncate text-xs text-(--muted-foreground)'>{headingSubtitle}</span>
          {/if}
        </DropdownMenu.Label>
      {/if}
      <MenuItems {items} variant='dropdown' />
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}

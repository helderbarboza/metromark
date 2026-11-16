<script lang='ts'>
  import type { MenuItem } from '$lib/menus'
  import type { TileSize } from '$lib/types'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import MenuItems from '$lib/components/molecules/MenuItems.svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { focusFirstMenuItem } from '$lib/menu-focus'

  interface Props {
    title: string
    /** Domain shown in the overflow menu heading, when known. */
    subtitle?: string
    size: TileSize
    writable: boolean
    /** Tile kind; folder tiles rename instead of editing and cannot be deleted. */
    kind?: 'bookmark' | 'folder'
    /** Increments when a selection was made from the keyboard, so focus can move here. */
    focusRequest?: number
    /** Commands that stay off the app bar itself. */
    menuItems: MenuItem[]
    onresize: (size: TileSize) => void
    onedit: () => void
    /** Omit to hide the delete command (folder tiles cannot be deleted). */
    ondelete?: () => void
    onmove: () => void
    onclear: () => void
  }

  const {
    title,
    subtitle,
    size,
    writable,
    kind = 'bookmark',
    focusRequest = 0,
    menuItems,
    onresize,
    onedit,
    ondelete,
    onmove,
    onclear,
  }: Props = $props()
  let bar = $state<HTMLDivElement | null>(null)
  let menuContentEl = $state<HTMLDivElement | null>(null)
  // Selection commands sit on the far left; a keyboard selection
  // moves focus into the bar so the commands are reachable with Tab.
  $effect(() => {
    if (focusRequest > 0) {
      bar
        ?.querySelector<HTMLElement>('[data-initial-focus]')
        ?.focus({ preventScroll: true })
    }
  })

  const presets = ['small', 'medium', 'wide', 'large'] as const
  const actionNoun = $derived(kind === 'folder' ? 'folder' : 'bookmark')
</script>

<div
  bind:this={bar}
  class='app-bar'
  role='toolbar'
  aria-label='Actions for {title}'
>
  <span class='selected-label'>
    <span class='selection-dot'></span>{title}
  </span>
  <div class='selection-actions'>
    <button
      data-initial-focus
      disabled={!writable}
      aria-label={kind === 'folder' ? 'Rename selected folder' : 'Edit selected bookmark'}
      onclick={onedit}
    >
      <Icon name='edit' size={15} />
    </button>
    <button
      disabled={!writable}
      aria-label={`Move selected ${actionNoun} to another folder`}
      onclick={onmove}
    >
      <Icon name='folder' size={15} />
    </button>
    {#if ondelete}
      <button
        class='delete'
        disabled={!writable}
        aria-label='Delete selected bookmark'
        onclick={ondelete}
      >
        <Icon name='delete' size={15} />
      </button>
    {/if}
  </div>
  <div class='size-options'>
    {#each presets as preset (preset)}
      <button
        class:active={size === preset}
        aria-pressed={size === preset}
        aria-label='Resize selected tile to {preset}'
        onclick={() => onresize(preset)}
      >
        {preset}
      </button>
    {/each}
  </div>
  <div class='bar-actions'>
    {#if menuItems.length > 0}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger aria-label='More actions for {title}'>
          <Icon name='more' size={16} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          bind:ref={menuContentEl}
          aria-label='Actions for {title}'
          class='w-65'
          side='top'
          align='end'
          onOpenAutoFocus={event => focusFirstMenuItem(event, menuContentEl)}
        >
          <DropdownMenu.Label class='flex flex-col gap-1.5 border-b px-2.5 pt-2.5 pb-3 select-none'>
            <strong class='truncate text-xs font-semibold'>{title}</strong>
            {#if subtitle}
              <span class='truncate text-xs text-(--muted-foreground)'>{subtitle}</span>
            {/if}
          </DropdownMenu.Label>
          <MenuItems items={menuItems} variant='dropdown' />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
    <button aria-label='Clear selection' onclick={onclear}>
      <Icon name='close' size={16} />
    </button>
  </div>
</div>

<style>
  /* Edge-docked command bar: full-bleed bottom edge, icon commands at the
     48x48 px minimum size with 2 mm padding between targets. */
  .app-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 24px;
    border: none;
    border-top: 1px solid var(--border);
    background: var(--card);
    padding: 8px 16px max(8px, env(safe-area-inset-bottom));
    box-shadow: var(--shadow);
  }
  .selected-label {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  .selection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--primary);
    flex-shrink: 0;
  }
  .selection-actions {
    display: flex;
    gap: var(--target-gap);
  }
  .selection-actions button {
    width: var(--target-min);
    height: var(--target-min);
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--muted-foreground);
    border-radius: 50%;
  }
  .selection-actions button:hover {
    background: var(--accent);
    color: var(--foreground);
  }
  .selection-actions button.delete:hover {
    color: var(--destructive);
  }
  .selection-actions button:disabled {
    opacity: 0.3;
  }
  .size-options {
    display: flex;
    gap: 3px;
    border-left: 1px solid var(--border);
    padding-left: 12px;
  }
  .size-options button {
    min-width: 56px;
    min-height: var(--target-min);
    padding: 8px 11px;
    border-radius: 3px;
    font-size: 11px;
    text-transform: capitalize;
    background: transparent;
    color: var(--muted-foreground);
  }
  .size-options button:hover,
  .size-options button.active {
    background: var(--accent);
    color: var(--foreground);
  }
  .bar-actions {
    display: flex;
    gap: var(--target-gap);
    border-left: 1px solid var(--border);
    padding-left: 12px;
  }
  .bar-actions button {
    width: var(--target-min);
    height: var(--target-min);
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--muted-foreground);
    border-radius: 50%;
  }
  .bar-actions button:hover {
    background: var(--accent);
    color: var(--foreground);
  }
  .bar-actions button:disabled {
    opacity: 0.3;
  }
  @media (max-width: 600px) {
    .selected-label {
      display: none;
    }
    .app-bar {
      gap: 10px;
    }
    .size-options button {
      min-width: 48px;
      padding: 8px;
    }
  }
</style>

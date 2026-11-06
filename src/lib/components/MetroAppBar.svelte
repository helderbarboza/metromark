<script lang='ts'>
  import type { TileSize } from '$lib/types'
  import Icon from '$lib/components/Icon.svelte'

  interface Props {
    title: string
    size: TileSize
    writable: boolean
    /** Increments when a selection was made from the keyboard, so focus can move here. */
    focusRequest?: number
    onresize: (size: TileSize) => void
    onedit: () => void
    ondelete: () => void
    onmove: () => void
    onmore: (event: MouseEvent) => void
    onclear: () => void
  }

  const {
    title,
    size,
    writable,
    focusRequest = 0,
    onresize,
    onedit,
    ondelete,
    onmove,
    onmore,
    onclear,
  }: Props = $props()
  let bar = $state<HTMLDivElement | null>(null)
  // Selection commands sit on the far left (uwp8 p. 120); a keyboard selection
  // moves focus into the bar so the commands are reachable with Tab.
  $effect(() => {
    if (focusRequest > 0) {
      bar
        ?.querySelector<HTMLElement>('[data-initial-focus]')
        ?.focus({ preventScroll: true })
    }
  })

  const presets = ['small', 'medium', 'wide', 'large'] as const
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
      aria-label='Edit selected bookmark'
      onclick={onedit}
    >
      <Icon name='edit' size={15} />
    </button>
    <button
      disabled={!writable}
      aria-label='Move selected bookmark to another folder'
      onclick={onmove}
    >
      <Icon name='folder' size={15} />
    </button>
    <button
      class='delete'
      disabled={!writable}
      aria-label='Delete selected bookmark'
      onclick={ondelete}
    >
      <Icon name='delete' size={15} />
    </button>
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
    <button
      aria-label='More actions for {title}'
      aria-haspopup='menu'
      onclick={onmore}
    >
      <Icon name='more' size={16} />
    </button>
    <button aria-label='Clear selection' onclick={onclear}>
      <Icon name='close' size={16} />
    </button>
  </div>
</div>

<style>
  /* Edge-docked command bar (uwp8.pdf, app bars p.156): full-bleed bottom
     edge, icon commands at the p.105 minimum of 48x48 px with 2 mm padding
     between targets. */
  .app-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 24px;
    border: none;
    border-top: 1px solid var(--border);
    background: var(--card);
    padding: 8px 16px max(8px, env(safe-area-inset-bottom));
    z-index: 50;
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

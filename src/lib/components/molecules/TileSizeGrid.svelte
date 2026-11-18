<script lang='ts'>
  import type { TileSize } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import { TILE_SIZES } from '$lib/layout'
  import { cn } from '$lib/utils.js'

  /**
   * TILE SIZE preset row shown inside the tile context menu. Kept as a menu
   * section (not a dialog) by design; the Appearance dialog carries the full
   * appearance editor.
   */
  interface Props {
    size: TileSize
    /** Presets the active view offers, smallest first. */
    sizes?: readonly TileSize[]
    onresize: (size: TileSize) => void
  }

  const { size, sizes = TILE_SIZES, onresize }: Props = $props()
  const boxClass: Record<TileSize, string> = {
    small: 'size-1.75',
    medium: 'size-3',
    wide: 'h-2.5 w-5',
    large: 'size-3.5',
  }
</script>

<ContextMenu.Separator />
<ContextMenu.Label class='px-2 pt-2 pb-1.5 text-xs tracking-widest text-(--muted-foreground)'>
  {$LL.tileSizeGrid.tileSize()}
</ContextMenu.Label>
<ContextMenu.Group class='flex gap-1 px-1 pb-1.5'>
  {#each sizes as preset (preset)}
    <ContextMenu.Item
      aria-label={$LL.tileSizeGrid.resizeTo({
        size: $LL.tileSizes[preset](),
      })}
      onSelect={() => onresize(preset)}
      class={cn(
        `
          flex h-16 flex-1 flex-col items-center justify-center gap-1.5 p-0 text-[10px]
          text-(--muted-foreground) capitalize
        `,
        size === preset && 'bg-(--accent) text-(--foreground)',
      )}
    >
      <span
        class={cn(
          'border border-current',
          boxClass[preset],
          // Current size gets a shape cue, not color alone.
          size === preset && 'outline-2 outline-offset-2 outline-(--primary)',
        )}
      ></span>
      <span>{$LL.tileSizes[preset]()}</span>
    </ContextMenu.Item>
  {/each}
</ContextMenu.Group>

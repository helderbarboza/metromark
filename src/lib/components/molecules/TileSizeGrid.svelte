<script lang='ts'>
  import type { TileSize } from '$lib/types'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import { cn } from '$lib/utils'

  /**
   * TILE SIZE preset row shown inside the tile context menu. Kept as a menu
   * section (not a dialog) by design; the Appearance dialog carries the full
   * appearance editor.
   */
  interface Props {
    size: TileSize
    onresize: (size: TileSize) => void
  }

  const { size, onresize }: Props = $props()
  const sizes: TileSize[] = ['small', 'medium', 'wide', 'large']
  const boxClass: Record<TileSize, string> = {
    small: 'size-[7px]',
    medium: 'size-3',
    wide: 'h-[10px] w-5',
    large: 'size-[14px]',
  }
</script>

<ContextMenu.Separator />
<ContextMenu.Label class='px-2 pt-2 pb-1.5 text-[11px] tracking-[1px] text-(--muted-foreground)'>
  TILE SIZE
</ContextMenu.Label>
<ContextMenu.Group class='flex gap-1 px-1 pb-1.5'>
  {#each sizes as preset (preset)}
    <ContextMenu.Item
      aria-label='Resize to {preset}'
      onSelect={() => onresize(preset)}
      class={cn(
        `
          flex h-16 w-1/4 flex-col items-center justify-center gap-1.5 p-0 text-[10px]
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
      <span>{preset}</span>
    </ContextMenu.Item>
  {/each}
</ContextMenu.Group>

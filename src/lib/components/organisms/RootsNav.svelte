<script lang='ts'>
  import type { BookmarkNode } from '$lib/types'
  import { countBookmarks } from '$lib/tree'

  interface Props {
    roots: BookmarkNode[]
    rootFilter: string
    bookmarkCount: number
    onSelect: (id: string) => void
  }

  const {
    roots,
    rootFilter,
    bookmarkCount,
    onSelect,
  }: Props = $props()

  function buttonClass(active: boolean) {
    const base
      = 'flex h-7 items-center gap-2 rounded-sm px-2 text-xs whitespace-nowrap '
        + 'transition-[background-color,color] duration-150 motion-reduce:transition-none'
    return active
      ? `${base} bg-(--accent) text-(--foreground)`
      : `${base} bg-transparent text-(--muted-foreground) hover:text-(--foreground)`
  }

  function countClass(active: boolean) {
    return active ? 'text-xs text-(--accent-foreground)' : 'text-xs text-(--muted-foreground)'
  }
</script>

<nav
  class='flex min-w-0 scrollbar-thin gap-1.5 overflow-x-auto p-0.5'
  aria-label='Bookmark roots'
>
  <button
    class={buttonClass(rootFilter === 'all')}
    aria-pressed={rootFilter === 'all'}
    onclick={() => onSelect('all')}
  >All bookmarks <span class={countClass(rootFilter === 'all')}>{bookmarkCount}</span></button>
  {#each roots as root (root.id)}
    <button
      class={buttonClass(rootFilter === root.id)}
      aria-pressed={rootFilter === root.id}
      onclick={() => onSelect(root.id)}
    >{root.title}<span class={countClass(rootFilter === root.id)}>{countBookmarks(root)}</span></button>
  {/each}
</nav>

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
</script>

<nav
  class='flex min-w-0 scrollbar-thin gap-1.5 overflow-x-auto p-0.5'
  aria-label='Bookmark roots'
>
  <button
    class={rootFilter === 'all'
      ? `
        flex h-7 items-center gap-2 rounded-sm bg-(--accent) px-2 text-xs
        whitespace-nowrap text-(--foreground)
      `
      : `
        flex h-7 items-center gap-2 rounded-sm bg-transparent px-2 text-xs
        whitespace-nowrap text-(--muted-foreground)
        hover:text-(--foreground)
      `}
    aria-pressed={rootFilter === 'all'}
    onclick={() => onSelect('all')}
  >All bookmarks <span class={rootFilter === 'all' ? 'text-xs text-(--accent-foreground)' : 'text-xs text-(--muted-foreground)'}>{bookmarkCount}</span></button>
  {#each roots as root (root.id)}
    <button
      class={rootFilter === root.id
        ? `
          flex h-7 items-center gap-2 rounded-sm bg-(--accent) px-2 text-xs
          whitespace-nowrap text-(--foreground)
        `
        : `
          flex h-7 items-center gap-2 rounded-sm bg-transparent px-2 text-xs
          whitespace-nowrap text-(--muted-foreground)
          hover:text-(--foreground)
        `}
      aria-pressed={rootFilter === root.id}
      onclick={() => onSelect(root.id)}
    >{root.title}<span class={rootFilter === root.id ? 'text-xs text-(--accent-foreground)' : 'text-xs text-(--muted-foreground)'}>{countBookmarks(root)}</span></button>
  {/each}
</nav>

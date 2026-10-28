<script lang='ts'>
  import type { BookmarkNode } from '../types'
  import { countBookmarks } from '../tree'

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
        flex h-7 items-center gap-2 rounded-sm bg-(--surface-hover) px-2 text-xs
        whitespace-nowrap text-(--text)
      `
      : `
        flex h-7 items-center gap-2 rounded-sm bg-transparent px-2 text-xs
        whitespace-nowrap text-(--muted)
        hover:text-(--text)
      `}
    aria-pressed={rootFilter === 'all'}
    onclick={() => onSelect('all')}
  >All bookmarks <span class={rootFilter === 'all' ? 'text-xs text-(--accent)' : 'text-xs text-(--muted)'}>{bookmarkCount}</span></button>
  {#each roots as root (root.id)}
    <button
      class={rootFilter === root.id
        ? `
          flex h-7 items-center gap-2 rounded-sm bg-(--surface-hover) px-2 text-xs
          whitespace-nowrap text-(--text)
        `
        : `
          flex h-7 items-center gap-2 rounded-sm bg-transparent px-2 text-xs
          whitespace-nowrap text-(--muted)
          hover:text-(--text)
        `}
      aria-pressed={rootFilter === root.id}
      onclick={() => onSelect(root.id)}
    >{root.title}<span class={rootFilter === root.id ? 'text-xs text-(--accent)' : 'text-xs text-(--muted)'}>{countBookmarks(root)}</span></button>
  {/each}
</nav>

<script lang='ts'>
  import type { BookmarkNode } from '$lib/types'
  import * as Select from '$lib/components/ui/select'
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

  function labelFor(id: string): string {
    if (id === 'all')
      return `All bookmarks · ${bookmarkCount}`
    const root = roots.find(node => node.id === id)
    return root ? `${root.title} · ${countBookmarks(root)}` : 'All bookmarks'
  }

  const selectedLabel = $derived(labelFor(rootFilter))
</script>

<Select.Root
  type='single'
  value={rootFilter}
  onValueChange={id => id && onSelect(id)}
>
  <Select.Trigger
    size='sm'
    class='
      h-7 gap-2 border-none bg-transparent px-2 text-xs shadow-none
      data-[size=sm]:h-7
    '
    aria-label='Bookmark root'
  >
    {selectedLabel}
  </Select.Trigger>
  <Select.Content>
    <Select.Group>
      <Select.Item value='all'>All bookmarks · {bookmarkCount}</Select.Item>
      {#each roots as root (root.id)}
        <Select.Item value={root.id}>{root.title} · {countBookmarks(root)}</Select.Item>
      {/each}
    </Select.Group>
  </Select.Content>
</Select.Root>

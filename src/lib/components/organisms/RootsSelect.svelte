<script lang='ts'>
  import type { BookmarkNode } from '$lib/types'
  import LL, { locale } from '$i18n/i18n-svelte'
  import * as Select from '$lib/components/ui/select'

  interface Props {
    roots: BookmarkNode[]
    rootFilter: string
    bookmarkCount: number
    onSelect: (id: string) => void
  }

  const {
    roots,
    rootFilter,
    onSelect,
  }: Props = $props()

  function labelFor(id: string): string {
    if (id === 'all')
      return $LL.roots.allBookmarks()
    const root = roots.find(node => node.id === id)
    return root ? root.title : $LL.roots.allBookmarks()
  }

  const selectedLabel = $derived.by(() => {
    void $locale
    return labelFor(rootFilter)
  })
</script>

<Select.Root
  type='single'
  value={rootFilter}
  onValueChange={id => id && onSelect(id)}
>
  <Select.Trigger
    size='sm'
    class='
      gap-2 border-none bg-transparent text-xs text-foreground shadow-none
      backdrop-blur-lg transition-colors
      [&_svg]:text-foreground
    '
    aria-label={$LL.roots.label()}
  >
    {selectedLabel}
  </Select.Trigger>
  <Select.Content align='start'>
    <Select.Group>
      <Select.Item value='all'>{$LL.roots.allBookmarks()}</Select.Item>
      {#each roots as root (root.id)}
        <Select.Item value={root.id}>{root.title}</Select.Item>
      {/each}
    </Select.Group>
  </Select.Content>
</Select.Root>

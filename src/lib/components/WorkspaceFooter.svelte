<script lang='ts'>
  import type { GroupView } from '$lib/types'
  import Icon from '$lib/components/Icon.svelte'
  import IconButton from '$lib/components/IconButton.svelte'

  interface Props {
    query?: string
    searchInput?: HTMLInputElement | null
    bookmarkCount: number
    folderCount: number
    visibleGroups: GroupView[]
    activeGroup: number
    canScroll: boolean
    scrollProgress: number
    preview: boolean
    busy: boolean
    onSearch: () => void
    onJump: (index: number) => void
    onScroll: (direction: -1 | 1) => void
  }

  let {
    query = $bindable(''),
    searchInput = $bindable<HTMLInputElement | null>(null),
    bookmarkCount,
    folderCount,
    visibleGroups,
    activeGroup,
    canScroll,
    scrollProgress,
    preview,
    busy,
    onSearch,
    onJump,
    onScroll,
  }: Props = $props()

  function handleInput(event: Event) {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null
    if (input)
      query = input.value
    onSearch()
  }
</script>

<footer
  class='
    flex min-h-16 shrink-0 items-center justify-between gap-5 px-16 pb-1.5
    max-lg:px-9
    max-md:px-6
  '
>
  <span role='status' class='sr-only'>{busy ? 'Saving changes…' : ''}</span>
  <div class='flex shrink-0 items-center'>
    <label
      class='
        flex h-8 w-60 items-center gap-2.5 rounded-sm border border-(--line)
        bg-(--surface) px-3 text-(--muted)
        focus-within:border-(--accent)
        max-lg:w-55
        max-md:h-9 max-md:w-46
      '
    >
      <Icon name='searchBookmarks' size={17} />
      <input
        bind:this={searchInput}
        value={query}
        oninput={handleInput}
        type='search'
        aria-label='Search bookmarks'
        placeholder='Find a bookmark…'
        autocomplete='off'
        spellcheck='false'
        class='
          w-full min-w-0 bg-transparent p-0 text-xs text-(--text) outline-none
          placeholder:text-(--muted)
          [&::-webkit-search-cancel-button]:hidden
        '
      />
      {#if query}
        <button
          aria-label='Clear search'
          class='bg-transparent p-1 text-(--muted)'
          onclick={() => {
            query = ''
            searchInput?.focus()
          }}
        >
          <Icon name='close' size={13} />
        </button>
      {:else}
        <kbd
          class='
            flex h-5 w-4 items-center justify-center rounded-sm border border-(--line)
            font-[inherit] text-xs
          '
        >/</kbd>
      {/if}
    </label>
  </div>
  <div class='flex min-w-0 flex-1 items-center justify-center gap-5'>
    <nav
      class='absolute left-1/2 flex -translate-x-1/2 gap-1.5 p-2.5 max-md:hidden'
      aria-label='Jump to bookmark group'
    >
      {#each visibleGroups as group, index (group.id)}
        <button
          class={activeGroup === index
            ? 'w-4 rounded-full bg-(--accent) p-0 transition-all'
            : 'size-1 rounded-full bg-(--line) p-0 transition-all'}
          aria-label="Jump to {group.path.join(' / ')}"
          aria-current={activeGroup === index ? 'true' : undefined}
          onclick={() => onJump(index)}
        >
        </button>
      {/each}
    </nav>
  </div>
  <div class='flex shrink-0 items-center gap-4'>
    <div class='flex items-center gap-1.5 text-xs whitespace-nowrap text-(--muted)'>
      <span class='max-sm:hidden'>{bookmarkCount} bookmarks, {folderCount} folders</span>
      <span class='sm:hidden'>{bookmarkCount} / {folderCount}</span>
      {#if preview}
        <span
          class='rounded-sm border border-(--line) px-1.5 py-0.5 text-xs text-(--muted)'
          title='saved locally, not your real bookmarks'
        >Demo</span>
      {/if}
    </div>
    <div class='flex items-center gap-0.5'>
      <IconButton
        label='Scroll groups left'
        class='h-7 w-6 rounded-sm disabled:opacity-25'
        disabled={!canScroll || scrollProgress < 0.01}
        onclick={() => onScroll(-1)}
      >
        <Icon name='arrowLeft' size={17} />
      </IconButton>
      <IconButton
        label='Scroll groups right'
        class='h-7 w-6 rounded-sm disabled:opacity-25'
        disabled={!canScroll || scrollProgress > 0.99}
        onclick={() => onScroll(1)}
      >
        <Icon name='arrowRight' size={17} />
      </IconButton>
    </div>
  </div>
</footer>

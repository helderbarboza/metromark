<script lang='ts'>
  import type { GroupView } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Tooltip from '$lib/components/ui/tooltip'
  import { cn } from '$lib/utils.js'
  import { Tooltip as TooltipPrimitive } from 'bits-ui'

  interface Props {
    query?: string
    searchInput?: HTMLInputElement | null
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

  // One tether for every jump dot, so the singleton tooltip uses a single
  // portal instead of one portal per dot.
  const jumpTether = TooltipPrimitive.createTether<string>()

  function handleInput(event: Event) {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null
    if (input)
      query = input.value
    onSearch()
  }
</script>

<footer
  class='
    flex min-h-16 shrink-0 items-center justify-between gap-5 px-40 pb-1.5
    max-lg:px-9
    max-md:px-6
  '
>
  <span role='status' class='sr-only'>{busy ? $LL.footer.savingChanges() : ''}</span>
  <div class='flex shrink-0 items-center'>
    <label
      class='
        flex h-8 w-60 items-center gap-2.5 rounded-sm border border-(--border) bg-(--card)
        px-3 text-(--muted-foreground)
        focus-within:border-(--primary)
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
        aria-label={$LL.footer.searchBookmarks()}
        placeholder={$LL.search.placeholder()}
        autocomplete='off'
        spellcheck='false'
        class='
          w-full min-w-0 bg-transparent p-0 text-xs text-(--foreground) outline-none
          placeholder:text-(--muted-foreground)
          focus-visible:outline-0!
          [&::-webkit-search-cancel-button]:hidden
        '
      />
      {#if query}
        <button
          aria-label={$LL.search.clearSearch()}
          class='flex items-center bg-transparent p-1 text-(--muted-foreground)'
          onclick={() => {
            query = ''
            searchInput?.focus()
          }}
        >
          <Icon name='close' class='size-4' />
        </button>
      {:else}
        <kbd
          class='
            flex h-5 w-4 items-center justify-center rounded-sm border border-(--border)
            font-[inherit] text-xs
          '
        >/</kbd>
      {/if}
    </label>
  </div>
  <div class='flex min-w-0 flex-1 items-center justify-center gap-5'>
    <Tooltip.Root tether={jumpTether}>
      {#snippet children({ payload })}
        <nav
          class='
            absolute left-1/2 flex -translate-x-1/2 px-2
            transition-[background-color,opacity]
            hover:bg-background
            max-md:hidden
          '
          aria-label={$LL.footer.jumpToGroup()}
        >
          {#each visibleGroups as group, index (group.id)}
            <Tooltip.Trigger
              tether={jumpTether}
              payload={group.title}
              class='group/button px-1 py-3'
              aria-label={$LL.footer.jumpToGroupPath({ path: group.path.join(' / ') })}
              aria-current={activeGroup === index ? 'true' : undefined}
              onclick={() => onJump(index)}
            >
              <span
                class={cn(
                  activeGroup === index
                    ? 'h-1 w-4 bg-(--primary)'
                    : 'size-1 bg-(--muted-foreground)',
                  `
                    block rounded-full p-0 transition-all
                    group-hover/button:bg-(--foreground)
                  `,
                )}
              ></span>
            </Tooltip.Trigger>
          {/each}
        </nav>
        <Tooltip.Content
          class='
            data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0
            data-[state=instant-open]:zoom-in-95
          '
          side='top'
        >{payload}</Tooltip.Content>
      {/snippet}
    </Tooltip.Root>
  </div>
  <div class='flex shrink-0 items-center gap-4'>
    <div
      class={cn(`
        flex items-center gap-1.5 text-xs whitespace-nowrap text-(--muted-foreground)
      `)}
    >
      {#if preview}
        <span
          class='
            rounded-sm border border-(--border) px-1.5 py-0.5 text-xs
            text-(--muted-foreground)
          '
          title={$LL.footer.demoTitle()}
        >{$LL.footer.demo()}</span>
      {/if}
    </div>
    <div class='flex items-center gap-0.5'>
      <Button
        title={$LL.footer.scrollLeft()}
        size='icon'
        variant='ghost'
        disabled={!canScroll || scrollProgress < 0.01}
        onclick={() => onScroll(-1)}
      >
        <Icon name='arrowLeft' size={17} />
      </Button>
      <Button
        title={$LL.footer.scrollRight()}
        size='icon'
        variant='ghost'
        disabled={!canScroll || scrollProgress > 0.99}
        onclick={() => onScroll(1)}
      >
        <Icon name='arrowRight' size={17} />
      </Button>
    </div>
  </div>
</footer>

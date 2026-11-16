<script lang='ts'>
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import { Button } from '$lib/components/ui/button'

  interface Props {
    /** Which empty/loading state to render. */
    variant: 'loading' | 'no-results' | 'no-folders'
    /** Loading variant only: the load failure, if any. */
    loadError?: string
    /** No-results variant only: the query that produced no matches. */
    query?: string
    /** No-results variant only: clear the search box. */
    onclearsearch?: () => void
  }

  const { variant, loadError = '', query = '', onclearsearch }: Props = $props()
</script>

{#if variant === 'loading'}
  <div
    class='
      flex size-full min-h-60 flex-col items-center justify-center text-center
      text-(--muted-foreground)
    '
  >
    {#if loadError}
      <Icon name='lock' size={28} />
      <h2 class='mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--foreground)'>
        {$LL.status.reconnectingTitle()}
      </h2>
      <p class='mb-6 px-5 text-xs/relaxed'>{loadError}</p>
      <button onclick={() => window.location.reload()}>
        {$LL.status.reloadPage()}
      </button>
    {:else}
      <span
        class='
          mb-5 size-6 animate-spin rounded-full border border-(--border)
          border-t-(--primary)
        '
      >
      </span>
      <p class='mb-6 px-5 text-xs/relaxed'>
        {$LL.status.findingFavorites()}
      </p>
    {/if}
  </div>
{:else if variant === 'no-results'}
  <div class='flex size-full min-h-60 flex-col items-center justify-center'>
    <Icon name='searchBookmarks' size={33} />
    <h2 class='mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--foreground)'>
      {$LL.search.noFavoritesFound()}
    </h2>
    <p class='mb-6 px-5 text-xs/relaxed'>
      {$LL.search.noFavoritesDetail({ query })}
    </p>
    <Button onclick={onclearsearch}>{$LL.search.clearSearch()}</Button>
  </div>
{:else}
  <div
    class='
      flex size-full min-h-60 flex-col items-center justify-center text-center
      text-(--muted-foreground)
    '
  >
    <h2 class='mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--foreground)'>
      {$LL.status.noFoldersTitle()}
    </h2>
    <p class='mb-6 px-5 text-xs/relaxed'>
      {$LL.status.noFoldersDetail()}
    </p>
  </div>
{/if}

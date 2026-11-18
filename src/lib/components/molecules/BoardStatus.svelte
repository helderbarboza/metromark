<script lang='ts'>
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Empty from '$lib/components/ui/empty'

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
  <Empty.Root class='size-full min-h-60'>
    <Empty.Header>
      {#if loadError}
        <Empty.Media variant='icon'>
          <Icon name='lock' size={22} />
        </Empty.Media>
        <Empty.Title role='heading' aria-level={2}>{$LL.status.reconnectingTitle()}</Empty.Title>
        <Empty.Description>{loadError}</Empty.Description>
      {:else}
        <Empty.Media variant='icon'>
          <span
            class='
              size-6 animate-spin rounded-full border border-(--border)
              border-t-(--primary)
            '
          ></span>
        </Empty.Media>
        <Empty.Description>{$LL.status.findingFavorites()}</Empty.Description>
      {/if}
    </Empty.Header>
    {#if loadError}
      <Empty.Content>
        <Button variant='outline' size='sm' onclick={() => window.location.reload()}>
          {$LL.status.reloadPage()}
        </Button>
      </Empty.Content>
    {/if}
  </Empty.Root>
{:else if variant === 'no-results'}
  <Empty.Root class='size-full min-h-60'>
    <Empty.Header>
      <Empty.Media variant='icon'>
        <Icon name='searchBookmarks' size={22} />
      </Empty.Media>
      <Empty.Title role='heading' aria-level={2}>{$LL.search.noFavoritesFound()}</Empty.Title>
      <Empty.Description>{$LL.search.noFavoritesDetail({ query })}</Empty.Description>
    </Empty.Header>
    <Empty.Content>
      <Button variant='outline' size='sm' onclick={onclearsearch}>
        {$LL.search.clearSearch()}
      </Button>
    </Empty.Content>
  </Empty.Root>
{:else}
  <Empty.Root class='size-full min-h-60'>
    <Empty.Header>
      <Empty.Title role='heading' aria-level={2}>{$LL.status.noFoldersTitle()}</Empty.Title>
      <Empty.Description>{$LL.status.noFoldersDetail()}</Empty.Description>
    </Empty.Header>
  </Empty.Root>
{/if}

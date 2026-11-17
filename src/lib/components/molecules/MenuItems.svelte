<script lang='ts'>
  import type { MenuItem } from '$lib/menus'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'

  /**
   * Shared body for the app's context and dropdown menus. Each family has its
   * own Item/Group/Separator primitives, so the two blocks below mirror each
   * other; keep them in sync when changing item rendering.
   */
  interface Props {
    items: MenuItem[]
    /** Which menu family renders these items. */
    variant: 'context' | 'dropdown'
  }

  const { items, variant }: Props = $props()
</script>

{#snippet itemIcon(item: MenuItem)}
  <Icon name={item.icon} size={15} />
  <span>{item.label}</span>
{/snippet}

{#if variant === 'context'}
  <ContextMenu.Group>
    {#each items as item (item.label)}
      {#if item.separator}<ContextMenu.Separator />{/if}
      {#if item.checked !== undefined}
        <ContextMenu.CheckboxItem
          disabled={item.disabled}
          checked={item.checked}
          onCheckedChange={() => item.action()}
        >
          {@render itemIcon(item)}
        </ContextMenu.CheckboxItem>
      {:else}
        <ContextMenu.Item
          disabled={item.disabled}
          variant={item.danger ? 'destructive' : 'default'}
          onSelect={item.action}
        >
          {@render itemIcon(item)}
        </ContextMenu.Item>
      {/if}
    {/each}
  </ContextMenu.Group>
{:else}
  <DropdownMenu.Group>
    {#each items as item (item.label)}
      {#if item.separator}<DropdownMenu.Separator />{/if}
      {#if item.checked !== undefined}
        <DropdownMenu.CheckboxItem
          disabled={item.disabled}
          checked={item.checked}
          onCheckedChange={() => item.action()}
        >
          {@render itemIcon(item)}
        </DropdownMenu.CheckboxItem>
      {:else}
        <DropdownMenu.Item
          disabled={item.disabled}
          variant={item.danger ? 'destructive' : 'default'}
          onSelect={item.action}
        >
          {@render itemIcon(item)}
        </DropdownMenu.Item>
      {/if}
    {/each}
  </DropdownMenu.Group>
{/if}

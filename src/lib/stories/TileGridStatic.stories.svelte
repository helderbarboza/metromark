<script
  module
  lang='ts'
>
  import type { TileSize } from '$lib/types'
  import type { ComponentProps } from 'svelte'
  import BookmarkTile from '$lib/components/BookmarkTile.svelte'
  import { cellsToPx, SIZES } from '$lib/layout-constants'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect } from 'storybook/test'

  interface StaticTile {
    id: string
    title: string
    colorIndex: number
    domain: string
    href: string
    size: TileSize
  }

  const staticTiles: StaticTile[] = [
    { id: 'slack', title: 'Slack', colorIndex: 0, domain: 'slack.com', href: 'https://slack.com', size: 'small' },
    { id: 'steam', title: 'Steam', colorIndex: 1, domain: 'store.steampowered.com', href: 'https://store.steampowered.com/', size: 'medium' },
    { id: 'gmail', title: 'Gmail', colorIndex: 2, domain: 'mail.google.com', href: 'https://mail.google.com', size: 'wide' },
    { id: 'notion', title: 'Notion', colorIndex: 3, domain: 'notion.so', href: 'https://notion.so', size: 'large' },
  ]

  const { Story } = defineMeta({
    title: 'Organisms/Tile grid static',
    component: BookmarkTile,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
      tile: { title: 'Steam', colorIndex: 1, url: 'https://store.steampowered.com/' },
      size: 'medium',
      domain: 'store.steampowered.com',
      showDomain: true,
    },
  })

  function label(tile: StaticTile, showDomain: boolean): string {
    return `Open ${tile.title}${showDomain && tile.size !== 'small' ? ` ${tile.domain}` : ''}`
  }
</script>

{#snippet template(args: ComponentProps<typeof BookmarkTile>)}
  <div
    style='display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;padding:32px;
      background:var(--background);min-height:100vh'
  >
    {#each staticTiles as tile (tile.id)}
      {@const [w, h] = SIZES[tile.size]}
      <div style={`width:${cellsToPx(w, 68)}px;height:${cellsToPx(h, 68)}px;--cell:68px`}>
        <BookmarkTile
          tile={{ title: tile.title, colorIndex: tile.colorIndex, url: tile.href }}
          size={tile.size}
          domain={tile.domain}
          showDomain={args.showDomain ?? true}
          href={tile.href}
          ariaLabel={label(tile, args.showDomain ?? true)}
        />
      </div>
    {/each}
  </div>
{/snippet}

<Story
  name='All presets'
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Gmail/ })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Notion/ })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: 'Open Slack' })).toBeVisible()
    await expect(canvas.getByText('store.steampowered.com')).toBeVisible()
    await expect(canvas.getByText('mail.google.com')).toBeVisible()
  }}
/>

<Story
  name='Hidden domains'
  args={{ showDomain: false }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
    await expect(canvas.queryByText('store.steampowered.com')).not.toBeInTheDocument()
    await expect(canvas.queryByText('mail.google.com')).not.toBeInTheDocument()
  }}
/>

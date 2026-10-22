<script
  module
  lang='ts'
>
  import type { ComponentProps } from 'svelte'
  import type { TileSize } from '../types'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect } from 'storybook/test'
  import MetroTile from '../components/MetroTile.svelte'
  import { globeIcon } from '../icons'
  import { cellsToPx, SIZES } from '../layout'

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
    title: 'Metro/Tile grid static',
    component: MetroTile,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
      tile: { title: 'Steam', colorIndex: 1, url: 'https://store.steampowered.com/', icon: globeIcon },
      size: 'medium',
      domain: 'store.steampowered.com',
      showDomain: true,
    },
  })

  function label(tile: StaticTile, showDomain: boolean): string {
    return `Open ${tile.title}${showDomain && tile.size !== 'small' ? ` ${tile.domain}` : ''}`
  }
</script>

{#snippet template(args: ComponentProps<typeof MetroTile>)}
  <div
    style='display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;padding:32px;
      background:var(--bg);min-height:100vh'
  >
    {#each staticTiles as tile (tile.id)}
      <a
        href={tile.href}
        aria-label={label(tile, args.showDomain ?? true)}
        style='
          display:block;
          width:{cellsToPx(SIZES[tile.size][0], 68)}px;
            height:{cellsToPx(SIZES[tile.size][1], 68)}px;
            text-decoration:none'
      >
        <MetroTile
          tile={{ title: tile.title, colorIndex: tile.colorIndex, url: tile.href, icon: globeIcon }}
          size={tile.size}
          domain={tile.domain}
          showDomain={args.showDomain ?? true}
        />
      </a>
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

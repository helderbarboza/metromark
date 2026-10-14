<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect } from 'storybook/test';
  import MetroTile from '../components/MetroTile.svelte';
  import type { ComponentProps } from 'svelte';
  import { getIcon } from '../icons';
  import { SIZES, cellsToPx } from '../layout';
  import type { TileSize } from '../types';

  interface StaticTile {
    id: string;
    title: string;
    color: string;
    icon: string;
    domain: string;
    href: string;
    size: TileSize;
  }

  const staticTiles: StaticTile[] = [
    { id: 'slack', title: 'Slack', color: '#845576', icon: getIcon('slack'), domain: 'slack.com', href: 'https://slack.com', size: 'small' },
    { id: 'figma', title: 'Figma', color: '#af572f', icon: getIcon('figma'), domain: 'figma.com', href: 'https://figma.com', size: 'medium' },
    { id: 'gmail', title: 'Gmail', color: '#a44f4c', icon: getIcon('gmail'), domain: 'mail.google.com', href: 'https://mail.google.com', size: 'wide' },
    { id: 'notion', title: 'Notion', color: '#586857', icon: getIcon('notion'), domain: 'notion.so', href: 'https://notion.so', size: 'large' },
  ];

  const { Story } = defineMeta({
    title: 'Metro/Tile grid static', component: MetroTile, tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
      tile: { title: 'Figma', color: '#af572f', icon: getIcon('figma') },
      size: 'medium', domain: 'figma.com', showDomain: true,
    },
  });

  function label(tile: StaticTile, showDomain: boolean): string {
    return `Open ${tile.title}${showDomain && tile.size !== 'small' ? ` ${tile.domain}` : ''}`;
  }
</script>

{#snippet template(args: ComponentProps<typeof MetroTile>)}
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;padding:32px;background:var(--bg);min-height:100vh">
    {#each staticTiles as tile (tile.id)}
      <a
        href={tile.href}
        aria-label={label(tile, args.showDomain ?? true)}
        style="display:block;width:{cellsToPx(SIZES[tile.size][0], 68)}px;height:{cellsToPx(SIZES[tile.size][1], 68)}px;text-decoration:none"
      >
        <MetroTile tile={{ title: tile.title, color: tile.color, icon: tile.icon }} size={tile.size} domain={tile.domain} showDomain={args.showDomain ?? true} />
      </a>
    {/each}
  </div>
{/snippet}

<Story
  name="All presets"
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible();
    await expect(await canvas.findByRole('link', { name: /^Open Gmail/ })).toBeVisible();
    await expect(await canvas.findByRole('link', { name: /^Open Notion/ })).toBeVisible();
    await expect(await canvas.findByRole('link', { name: 'Open Slack' })).toBeVisible();
    await expect(canvas.getByText('figma.com')).toBeVisible();
    await expect(canvas.getByText('mail.google.com')).toBeVisible();
  }}
/>

<Story
  name="Hidden domains"
  args={{ showDomain: false }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible();
    await expect(canvas.queryByText('figma.com')).not.toBeInTheDocument();
    await expect(canvas.queryByText('mail.google.com')).not.toBeInTheDocument();
  }}
/>

<script
  module
  lang='ts'
>
  import type { ComponentProps } from 'svelte'
  import BookmarkTile from '$lib/components/organisms/BookmarkTile.svelte'
  import { cellsToPx, SIZES, TILE_SIZES } from '$lib/layout'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect } from 'storybook/test'

  const { Story } = defineMeta({
    title: 'Organisms/Bookmark tile',
    component: BookmarkTile,
    tags: ['autodocs'],
    args: { tile: { title: 'Steam', colorIndex: 0, url: 'https://store.steampowered.com/' }, size: 'medium', domain: 'store.steampowered.com', showDomain: true },
    argTypes: {
      size: { control: 'radio', options: [...TILE_SIZES] },
      selected: { control: 'boolean' },
      revealed: { control: 'boolean' },
    },
  })
</script>
{#snippet template(args: ComponentProps<typeof BookmarkTile>)}
  <BookmarkTile
    {...args}
    href='https://store.steampowered.com/'
    ariaLabel="Open {args.tile.title}{args.showDomain && args.size !== 'small'
      ? ` ${args.domain}`
      : ''}"
    style='display:block;
      width:{cellsToPx(SIZES[args.size][0], 68)}px;
        height:{cellsToPx(SIZES[args.size][1], 68)}px;
        text-decoration:none
    '
  />
{/snippet}
<Story
  name='Small'
  args={{ size: 'small' }}
  {template}
/>
<Story
  name='Medium'
  {template}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /^Open Steam/ })).toBeVisible()
    await expect(canvas.getByText('store.steampowered.com')).toBeVisible()
  }}
/>
<Story
  name='Wide'
  args={{ size: 'wide', tile: { title: 'Gmail', colorIndex: 3, url: 'https://mail.google.com' }, domain: 'mail.google.com' }}
  {template}
/>
<Story
  name='Large'
  args={{ size: 'large' }}
  {template}
/>
<Story
  name='Selected'
  args={{ selected: true, onresize: () => {} }}
  {template}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Grow Steam tile to Wide' })).toBeVisible()
  }}
/>
<Story
  name='Largest'
  args={{ selected: true, size: 'large', onresize: () => {} }}
  {template}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Shrink Steam tile to Small' })).toBeVisible()
  }}
/>
<Story
  name='Self-revealing'
  args={{ revealed: true }}
  {template}
/>
<Story
  name='Long title'
  args={{ tile: { title: 'A bookmark with a very long but completely safe title', colorIndex: 2, url: 'https://example.com' }, domain: 'example.com' }}
  {template}
/>
<Story
  name='Without icon'
  args={{ tile: { title: 'A quiet bookmark', colorIndex: 2, url: 'https://example.com' }, domain: 'example.com' }}
  {template}
/>

<script module
        lang='ts'
>
  import type { ComponentProps } from 'svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect } from 'storybook/test'
  import MetroTile from '../components/MetroTile.svelte'
  import { globeIcon } from '../icons'
  import { cellsToPx, SIZES } from '../layout'

  const { Story } = defineMeta({
    title: 'Metro/Bookmark tile',
    component: MetroTile,
    tags: ['autodocs'],
    args: { tile: { title: 'Figma', color: '#af572f', url: 'https://figma.com', icon: globeIcon }, size: 'medium', domain: 'figma.com', showDomain: true },
    argTypes: { size: { control: 'radio', options: ['small', 'medium', 'wide', 'large'] }, selected: { control: 'boolean' }, revealed: { control: 'boolean' } },
  })
</script>
{#snippet template(args: ComponentProps<typeof MetroTile>)}
  <a href='https://figma.com'
     aria-label="Open {args.tile.title}{args.showDomain && args.size !== 'small' ? ` ${args.domain}` : ''}"
     style='display:block;width:{cellsToPx(SIZES[args.size][0], 68)}px;height:{cellsToPx(SIZES[args.size][1], 68)}px;text-decoration:none'
  ><MetroTile {...args} /></a>
{/snippet}
<Story name='Small'
       args={{ size: 'small' }}
       {template}
/>
<Story name='Medium'
       {template}
       play={async ({ canvas }) => {
         await expect(canvas.getByRole('link', { name: /^Open Figma/ })).toBeVisible()
         await expect(canvas.getByText('figma.com')).toBeVisible()
       }}
/>
<Story name='Wide'
       args={{ size: 'wide', tile: { title: 'Gmail', color: '#a44f4c', url: 'https://mail.google.com', icon: globeIcon }, domain: 'mail.google.com' }}
       {template}
/>
<Story name='Large'
       args={{ size: 'large' }}
       {template}
/>
<Story name='Selected'
       args={{ selected: true }}
       {template}
/>
<Story name='Self-revealing'
       args={{ revealed: true }}
       {template}
/>
<Story name='Long title'
       args={{ tile: { title: 'A bookmark with a very long but completely safe title', color: '#3b546e', url: 'https://example.com', icon: globeIcon }, domain: 'example.com' }}
       {template}
/>
<Story name='Without icon'
       args={{ tile: { title: 'A quiet bookmark', color: '#3b546e', url: 'https://example.com', icon: globeIcon }, domain: 'example.com' }}
       {template}
/>

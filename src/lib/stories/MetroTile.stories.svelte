<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect } from 'storybook/test';
  import MetroTile from '../components/MetroTile.svelte';
  import type { ComponentProps } from 'svelte';
  import { getIcon } from '../icons';
  import { DENSITY, SIZES, cellsToPx } from '../layout';
  const { Story } = defineMeta({
    title: 'Metro/Bookmark tile', component: MetroTile, tags: ['autodocs'],
    args: { tile: { title: 'Figma', color: '#af572f', icon: getIcon('figma') }, size: 'medium', density: 'default', domain: 'figma.com', showDomain: true },
    argTypes: { size: { control: 'radio', options: ['small', 'medium', 'wide', 'large'] }, density: { control: 'radio', options: ['default', 'compact', 'small', 'half'] }, selected: { control: 'boolean' }, arranging: { control: 'boolean' } },
  });
</script>
{#snippet template(args: ComponentProps<typeof MetroTile>)}
  <a href="https://figma.com" aria-label="Open {args.tile.title}{args.showDomain && args.size !== 'small' ? ' ' + args.domain : ''}" style="display:block;width:{cellsToPx(SIZES[args.size][0], DENSITY[args.density ?? 'default'].cell, DENSITY[args.density ?? 'default'].gap)}px;height:{cellsToPx(SIZES[args.size][1], DENSITY[args.density ?? 'default'].cell, DENSITY[args.density ?? 'default'].gap)}px;text-decoration:none"><MetroTile {...args} /></a>
{/snippet}
<Story name="Small" args={{ size: 'small' }} {template} />
<Story name="Medium" {template} play={async ({ canvas }) => { await expect(canvas.getByRole('link', { name: /^Open Figma/ })).toBeVisible(); await expect(canvas.getByText('figma.com')).toBeVisible(); }} />
<Story name="Wide" args={{ size: 'wide', tile: { title: 'Gmail', color: '#a44f4c', icon: getIcon('gmail') }, domain: 'mail.google.com' }} {template} />
<Story name="Large" args={{ size: 'large' }} {template} />
<Story name="Selected" args={{ selected: true }} {template} />
<Story name="Arranging" args={{ arranging: true }} {template} />
<Story name="Long title" args={{ tile: { title: 'A bookmark with a very long but completely safe title', color: '#3b546e', icon: getIcon('globe') }, domain: 'example.com' }} {template} />
<Story name="Without icon" args={{ tile: { title: 'A quiet bookmark', color: '#3b546e' }, domain: 'example.com' }} {template} />

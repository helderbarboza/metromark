<script
  module
  lang='ts'
>
  import type { FolderTileView } from '$lib/types'
  import type { ComponentProps } from 'svelte'
  import FolderTile from '$lib/components/organisms/FolderTile.svelte'
  import { cellsToPx, SIZES, TILE_SIZES } from '$lib/layout'
  import FolderTileFixture from '$lib/stories/FolderTileFixture.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent, waitFor } from 'storybook/test'

  const fullPreview: FolderTileView['preview'] = [
    {
      id: 'mdn',
      kind: 'bookmark',
      title: 'MDN',
      url: 'https://developer.mozilla.org/',
      colorIndex: 5,
      color: undefined,
    },
    {
      id: 'svelte',
      kind: 'bookmark',
      title: 'Svelte',
      url: 'https://svelte.dev/',
      colorIndex: 6,
    },
    {
      id: 'ts',
      kind: 'bookmark',
      title: 'TypeScript',
      url: 'https://www.typescriptlang.org/',
      colorIndex: 2,
    },
    { id: 'tools', kind: 'folder', title: 'Tools' },
    {
      id: 'tailwind',
      kind: 'bookmark',
      title: 'Tailwind CSS',
      url: 'https://tailwindcss.com/',
      colorIndex: 3,
    },
    {
      id: 'vite',
      kind: 'bookmark',
      title: 'Vite',
      url: 'https://vite.dev/',
      colorIndex: 1,
    },
    {
      id: 'storybook',
      kind: 'bookmark',
      title: 'Storybook',
      url: 'https://storybook.js.org/',
      colorIndex: 0,
    },
    {
      id: 'snapgrid',
      kind: 'bookmark',
      title: 'Snapgrid',
      url: 'https://snapgrid.dev/',
      colorIndex: 4,
    },
    {
      id: 'figma',
      kind: 'bookmark',
      title: 'Figma',
      url: 'https://figma.com/',
      colorIndex: 7,
    },
    {
      id: 'arena',
      kind: 'bookmark',
      title: 'Are.na',
      url: 'https://www.are.na/',
      colorIndex: 5,
    },
    {
      id: 'layers',
      kind: 'bookmark',
      title: 'Layers',
      url: 'https://layers.to/',
      colorIndex: 1,
    },
  ]

  const { Story } = defineMeta({
    title: 'Organisms/Folder tile',
    component: FolderTile,
    tags: ['autodocs'],
    args: {
      tile: {
        id: 'design',
        kind: 'folder',
        colorIndex: 5,
        title: 'Design system',
        size: 'medium',
        writable: true,
        preview: fullPreview.slice(0, 6),
      },
      size: 'medium',
    },
    argTypes: {
      size: {
        control: 'radio',
        options: [...TILE_SIZES],
      },
      selected: { control: 'boolean' },
      revealed: { control: 'boolean' },
    },
  })
</script>
{#snippet template(args: ComponentProps<typeof FolderTile>)}
  <FolderTile
    {...args}
    ariaLabel='Folder {args.tile.title}'
    style='display:block;
      width:{cellsToPx(SIZES[args.size][0], 68)}px;
        height:{cellsToPx(SIZES[args.size][1], 68)}px
    '
  />
{/snippet}
<Story
  name='Small'
  args={{
    size: 'small',
    tile: {
      id: 'design',
      kind: 'folder',
      colorIndex: 5,
      title: 'Design system',
      size: 'small',
      writable: true,
      preview: fullPreview.slice(0, 4),
    },
  }}
  {template}
  play={async ({ canvas }) => {
    await expect(canvas
      .getByRole('button', { name: 'Folder Design system' })).toBeVisible()
  }}
/>
<Story
  name='Medium'
  {template}
/>
<Story
  name='Wide'
  args={{
    size: 'wide',
    tile: {
      id: 'design',
      kind: 'folder',
      colorIndex: 5,
      title: 'Design system',
      size: 'wide',
      writable: true,
      preview: fullPreview.slice(0, 12),
    },
  }}
  {template}
/>
<Story
  name='Large'
  args={{
    size: 'large',
    tile: {
      id: 'design',
      kind: 'folder',
      colorIndex: 5,
      title: 'Design system',
      size: 'large',
      writable: true,
      preview: fullPreview,
    },
  }}
  {template}
/>
<Story
  name='Empty folder'
  args={{
    tile: {
      id: 'quiet',
      kind: 'folder',
      colorIndex: 5,
      title: 'Quiet reading list',
      size: 'medium',
      writable: true,
      preview: [],
    },
  }}
  {template}
  play={async ({ canvas }) => {
    await expect(canvas
      .getByRole('button', { name: 'Folder Quiet reading list' })).toBeVisible()
  }}
/>
<Story
  name='Selected'
  args={{
    selected: true,
    onresize: fn(),
  }}
  {template}
  play={async ({ canvas }) => {
    await expect(canvas
      .getByRole('button', { name: 'Grow Design system folder tile to Wide' })).toBeVisible()
  }}
/>
<Story
  name='Largest'
  args={{
    selected: true,
    size: 'large',
    onresize: fn(),
  }}
  {template}
  play={async ({ canvas }) => {
    await expect(canvas
      .getByRole('button', { name: 'Shrink Design system folder tile to Small' })).toBeVisible()
  }}
/>
<Story
  name='Custom color'
  args={{
    tile: {
      id: 'design',
      kind: 'folder',
      title: 'Design system',
      size: 'medium',
      writable: true,
      colorIndex: 3,
      color: '#7a4ff3',
      preview: fullPreview.slice(0, 6),
    },
  }}
  {template}
/>
<Story
  name='Read-only'
  args={{
    tile: {
      id: 'design',
      kind: 'folder',
      colorIndex: 5,
      title: 'Design system',
      size: 'medium',
      writable: false,
      preview: fullPreview.slice(0, 6),
    },
  }}
  {template}
/>
<Story
  name='Long title'
  args={{
    tile: {
      id: 'design',
      kind: 'folder',
      colorIndex: 5,
      title: 'A folder with a very long but completely safe title',
      size: 'wide',
      writable: true,
      preview: fullPreview.slice(0, 12),
    },
    size: 'wide',
  }}
  {template}
/>
<Story
  name='Resize reflow'
  asChild
  play={async ({ canvas, canvasElement }) => {
    const cells = () => canvasElement.querySelectorAll('[data-preview-cell]')
    const tile = () => canvasElement.querySelector('[data-testid="folder-tile"]')
    const width = () => tile()?.getBoundingClientRect().width ?? 0
    await waitFor(() => expect(cells()).toHaveLength(6))
    await waitFor(() => expect(width()).toBeGreaterThan(0))
    const before = width()
    await userEvent.click(canvas.getByTestId('size-large'))
    await waitFor(() => expect(cells()).toHaveLength(30))
    await waitFor(() => expect(width()).toBeGreaterThan(before * 1.5))
  }}
>
  <FolderTileFixture />
</Story>
<Story
  name='Content changes'
  asChild
  play={async ({ canvas, canvasElement }) => {
    const cell = (key: string) => canvasElement.querySelector(`[data-preview-cell="${key}"]`)
    await waitFor(() => expect(cell('bookmark_a')).not.toBeNull())
    await userEvent.click(canvas.getByTestId('add-child'))
    await waitFor(() => expect(cell('bookmark_extra-3')).not.toBeNull())
    await userEvent.click(canvas.getByTestId('remove-child'))
    await waitFor(() => expect(cell('bookmark_extra-3')).toBeNull())
  }}
>
  <FolderTileFixture />
</Story>
<Story
  name='Reduced motion'
  asChild
  play={async ({ canvas, canvasElement }) => {
    const cells = () => canvasElement.querySelectorAll('[data-preview-cell]')
    await waitFor(() => expect(cells()).toHaveLength(6))
    await userEvent.click(canvas.getByTestId('size-large'))
    // Zero-duration tweens must still commit the new structure and render its cells.
    await waitFor(() => expect(cells()).toHaveLength(30))
  }}
>
  <FolderTileFixture reducedMotion />
</Story>
<Story
  name='Title exit'
  asChild
  play={async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-preview-title]')).not.toBeNull())
    await userEvent.click(canvas.getByTestId('size-small'))
    await waitFor(() => expect(canvasElement.querySelector('[data-preview-title]')).toBeNull())
  }}
>
  <FolderTileFixture />
</Story>

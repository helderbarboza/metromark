<script
  module
  lang='ts'
>
  import type { Layout } from '@snapgridjs/core'
  import type { ComponentProps } from 'svelte'
  import type { GroupView, TileView } from '../types'
  import { SnapGridGroup } from '@snapgridjs/svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn } from 'storybook/test'
  import MetroGroup from '../components/MetroGroup.svelte'
  import { globeIcon } from '../icons'

  const tiles: Record<string, TileView> = {
    figma: { id: 'figma', title: 'Figma', url: 'https://figma.com', domain: 'figma.com', icon: globeIcon, color: '#af572f', size: 'medium', writable: true },
    github: { id: 'github', title: 'GitHub', url: 'https://github.com', domain: 'github.com', icon: globeIcon, color: '#3b546e', size: 'medium', writable: true },
    gmail: { id: 'gmail', title: 'Gmail', url: 'https://mail.google.com', domain: 'mail.google.com', icon: globeIcon, color: '#a44f4c', size: 'wide', writable: true },
    notion: { id: 'notion', title: 'Notion', url: 'https://notion.so', domain: 'notion.so', icon: globeIcon, color: '#586857', size: 'large', writable: true },
    drive: { id: 'drive', title: 'Drive', url: 'https://drive.google.com', domain: 'drive.google.com', icon: globeIcon, color: '#467953', size: 'medium', writable: true },
    slack: { id: 'slack', title: 'Slack', url: 'https://slack.com', domain: 'slack.com', icon: globeIcon, color: '#845576', size: 'small', writable: true },
  }

  const layout: Layout = [
    { i: 'figma', x: 0, y: 0, w: 2, h: 2 },
    { i: 'github', x: 2, y: 0, w: 2, h: 2 },
    { i: 'gmail', x: 0, y: 2, w: 4, h: 2 },
    { i: 'notion', x: 4, y: 0, w: 4, h: 4 },
    { i: 'drive', x: 0, y: 4, w: 2, h: 2 },
    { i: 'slack', x: 2, y: 4, w: 1, h: 1 },
  ]

  const group: GroupView = {
    id: 'group-design',
    title: 'Design',
    path: ['Bookmarks bar', 'Design'],
    rootId: 'bar',
    isSystem: false,
    mutable: true,
    writable: true,
    layout,
    tiles,
  }

  const lockedGroup: GroupView = {
    ...group,
    id: 'bar',
    title: 'Bookmarks bar',
    path: ['Bookmarks bar'],
    isSystem: true,
    mutable: false,
    writable: false,
  }

  const emptyGroup: GroupView = {
    id: 'group-empty',
    title: 'Reading list',
    path: ['Bookmarks bar', 'Reading list'],
    rootId: 'bar',
    isSystem: false,
    mutable: true,
    writable: true,
    layout: [],
    tiles: {},
  }

  const { Story } = defineMeta({
    title: 'Metro/Tile grid',
    component: MetroGroup,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
      group,
      layout,
      tiles,
      cell: 68,
      draggable: true,
      dragging: false,
      selectedId: null,
      showDomains: true,
      preview: true,
      onLayoutChange: fn(),
      onDragStart: fn(),
      onDragStop: fn(),
      onSelect: fn(),
      onContext: fn(),
      onAdd: fn(),
      onBlocked: fn(),
    },
  })
</script>

{#snippet template(args: ComponentProps<typeof MetroGroup>)}
  <SnapGridGroup>
    <div style='padding:32px;background:var(--bg);min-height:100vh'>
      <MetroGroup {...args} />
    </div>
  </SnapGridGroup>
{/snippet}

<Story
  name='Mixed sizes'
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Design' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Gmail/ })).toBeVisible()
    await expect(canvas.getByText('mail.google.com')).toBeVisible()
  }}
/>

<Story
  name='Empty group'
  args={{ group: emptyGroup, layout: [], tiles: {} }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('Nothing here. Yet.')).toBeVisible()
    await expect(await canvas.findByRole('button', { name: 'Add a bookmark' })).toBeVisible()
  }}
/>

<Story
  name='Locked read-only'
  args={{ group: lockedGroup }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Bookmarks bar' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Add a bookmark' })).not.toBeInTheDocument()
  }}
/>

<Story
  name='Selection'
  args={{ selectedId: 'figma' }}
  {template}
  play={async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible()
    await expect(canvasElement.querySelectorAll('.metro-tile.selected')).toHaveLength(1)
  }}
/>

<Story
  name='Tiles are always draggable'
  {template}
  play={async ({ canvas, canvasElement }) => {
    const tile = await canvas.findByRole('link', { name: /^Open Figma/ })
    await expect(tile).toHaveAttribute('data-grid-id', 'figma')
    // Native link dragging must stay off so the pointer gesture belongs to the grid.
    await expect(tile).toHaveAttribute('draggable', 'false')
    await expect(canvasElement.querySelectorAll('.snapgrid-item')).toHaveLength(6)
  }}
/>

<Story
  name='Hidden domains'
  args={{ showDomains: false }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible()
    await expect(canvas.queryByText('figma.com')).not.toBeInTheDocument()
    await expect(canvas.queryByText('mail.google.com')).not.toBeInTheDocument()
  }}
/>

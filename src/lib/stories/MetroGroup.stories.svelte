<script
  module
  lang='ts'
>
  import type { GroupView, TileView } from '$lib/types'
  import type { Layout } from '@snapgridjs/core'
  import type { ComponentProps } from 'svelte'
  import MenuItems from '$lib/components/molecules/MenuItems.svelte'
  import MetroGroup from '$lib/components/organisms/MetroGroup.svelte'
  import WorkspaceProvider from '$lib/stories/WorkspaceProvider.svelte'
  import { SnapGridGroup } from '@snapgridjs/svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fireEvent, fn, screen, userEvent, waitFor } from 'storybook/test'

  const tiles: Record<string, TileView> = {
    steam: {
      id: 'steam',
      title: 'Steam',
      url: 'https://store.steampowered.com/',
      domain: 'store.steampowered.com',
      colorIndex: 0,
      size: 'medium',
      writable: true,
      kind: 'bookmark',
    },
    github: {
      id: 'github',
      title: 'GitHub',
      url: 'https://github.com',
      domain: 'github.com',
      colorIndex: 1,
      size: 'medium',
      writable: true,
      kind: 'bookmark',
    },
    gmail: {
      id: 'gmail',
      title: 'Gmail',
      url: 'https://mail.google.com',
      domain: 'mail.google.com',
      colorIndex: 2,
      size: 'wide',
      writable: true,
      kind: 'bookmark',
    },
    notion: {
      id: 'notion',
      title: 'Notion',
      url: 'https://notion.so',
      domain: 'notion.so',
      colorIndex: 3,
      size: 'large',
      writable: true,
      kind: 'bookmark',
    },
    drive: {
      id: 'drive',
      title: 'Drive',
      url: 'https://drive.google.com',
      domain: 'drive.google.com',
      colorIndex: 4,
      size: 'medium',
      writable: true,
      kind: 'bookmark',
    },
    slack: {
      id: 'slack',
      title: 'Slack',
      url: 'https://slack.com',
      domain: 'slack.com',
      colorIndex: 5,
      size: 'small',
      writable: true,
      kind: 'bookmark',
    },
  }

  const layout: Layout = [
    { i: 'steam', x: 0, y: 0, w: 2, h: 2 },
    { i: 'github', x: 2, y: 0, w: 2, h: 2 },
    { i: 'gmail', x: 0, y: 2, w: 4, h: 2 },
    { i: 'notion', x: 4, y: 0, w: 4, h: 4 },
    { i: 'drive', x: 0, y: 4, w: 2, h: 2 },
    { i: 'slack', x: 2, y: 4, w: 1, h: 1 },
  ]

  const folderTileId = 'design'
  const folderTiles: Record<string, TileView> = {
    ...tiles,
    [folderTileId]: {
      id: folderTileId,
      kind: 'folder',
      colorIndex: 4,
      title: 'Design system',
      size: 'medium',
      writable: true,
      preview: [
        {
          id: 'mdn',
          kind: 'bookmark',
          title: 'MDN',
          url: 'https://developer.mozilla.org/',
          colorIndex: 5,
        },
        {
          id: 'svelte',
          kind: 'bookmark',
          title: 'Svelte',
          url: 'https://svelte.dev/',
          colorIndex: 6,
        },
        {
          id: 'tools',
          kind: 'folder',
          colorIndex: 4,
          title: 'Tools',
        },
        {
          id: 'tailwind',
          kind: 'bookmark',
          title: 'Tailwind CSS',
          url: 'https://tailwindcss.com/',
          colorIndex: 3,
        },
      ],
    },
  }
  const folderLayout: Layout = [
    ...layout.map(entry => entry.i === 'slack'
      ? { ...entry, x: 4 as const, y: 4 as const }
      : entry),
    {
      i: folderTileId,
      x: 2,
      y: 4,
      w: 2,
      h: 2,
    },
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

  const narrowLayout: Layout = [
    { i: 'steam', x: 0, y: 0, w: 1, h: 1 },
    { i: 'slack', x: 1, y: 0, w: 1, h: 1 },
  ]

  const narrowGroup: GroupView = {
    ...group,
    id: 'group-narrow',
    title: 'Design system components',
    path: ['Bookmarks bar', 'Design system components'],
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

  // Dock: 2-row grid, Large remapped to Wide
  const dockTiles: Record<string, TileView> = Object.fromEntries(
    Object.entries(tiles).map(([id, tile]) => [
      id,
      {
        ...tile,
        size: tile.size === 'large'
          ? 'wide'
          : tile.size,
      },
    ]),
  )
  const dockLayout: Layout = [
    { i: 'steam', x: 0, y: 0, w: 2, h: 2 },
    { i: 'github', x: 2, y: 0, w: 2, h: 2 },
    { i: 'slack', x: 4, y: 1, w: 1, h: 1 },
    { i: 'gmail', x: 5, y: 0, w: 4, h: 2 },
    { i: 'drive', x: 9, y: 0, w: 2, h: 2 },
    { i: 'notion', x: 11, y: 0, w: 4, h: 2 },
  ]
  const dockGroup: GroupView = {
    ...group,
    id: 'group-dock',
    title: 'Dock view',
    layout: dockLayout,
    tiles: dockTiles,
  }

  const rename = fn()
  const { Story } = defineMeta({
    title: 'Organisms/Tile grid',
    component: MetroGroup,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
      group,
      layout,
      tiles,
      cell: 68,
      draggable: true,
      showDomains: true,
      preview: true,
      onLayoutChange: fn(),
      onDragStart: fn(),
      onDragStop: fn(),
      onSelect: fn(),
      onAdd: fn(),
    },
  })
</script>

{#snippet manageMenu(group: GroupView)}
  <MenuItems
    variant='context'
    items={[
      {
        label: 'Add new bookmark',
        icon: 'addBookmark',
        action: fn(),
        disabled: !group.writable,
      },
      {
        label: 'Rename folder',
        icon: 'edit',
        action: rename,
        separator: true,
      },
      {
        label: 'Delete folder',
        icon: 'delete',
        action: fn(),
        danger: true,
        disabled: !group.mutable,
        separator: true,
      },
    ]}
  />
{/snippet}

{#snippet template(args: ComponentProps<typeof MetroGroup>)}
  <SnapGridGroup>
    <div style='padding:32px;background:var(--background);min-height:100vh'>
      <WorkspaceProvider>
        <MetroGroup {...args} menu={manageMenu} />
      </WorkspaceProvider>
    </div>
  </SnapGridGroup>
{/snippet}

{#snippet selectionTemplate(args: ComponentProps<typeof MetroGroup>)}
  <SnapGridGroup>
    <div style='padding:32px;background:var(--background);min-height:100vh'>
      <WorkspaceProvider state={{ selectedId: 'steam' }}>
        <MetroGroup {...args} menu={manageMenu} />
      </WorkspaceProvider>
    </div>
  </SnapGridGroup>
{/snippet}

<Story
  name='Mixed sizes'
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Design' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Gmail/ })).toBeVisible()
    await userEvent.hover(canvas.getByRole('link', { name: /^Open Gmail/ }))
    await expect(canvas.getByText('mail.google.com')).toBeVisible()
  }}
/>

<Story
  name='Empty group'
  args={{ group: emptyGroup, layout: [], tiles: {} }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('This folder is empty')).toBeVisible()
    await expect(await canvas.findByRole('button', { name: 'Add a bookmark' })).toBeVisible()
  }}
/>

<Story
  name='Locked read-only'
  args={{ group: lockedGroup }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Bookmarks bar' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Add a bookmark' })).not.toBeInTheDocument()
  }}
/>

<Story
  name='Selection'
  template={selectionTemplate}
  play={async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
    const selected = canvasElement.querySelectorAll(
      '[data-testid="bookmark-tile"][data-selected]',
    )
    await expect(selected).toHaveLength(1)
  }}
/>

<Story
  name='Tiles are always draggable'
  {template}
  play={async ({ canvas, canvasElement }) => {
    const tile = await canvas.findByRole('link', { name: /^Open Steam/ })
    await expect(tile).toHaveAttribute('data-grid-id', 'steam')
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
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
    await expect(canvas.queryByText('store.steampowered.com')).not.toBeInTheDocument()
    await expect(canvas.queryByText('mail.google.com')).not.toBeInTheDocument()
  }}
/>
<Story
  name='With folder tile'
  args={{
    group: {
      ...group,
      layout: folderLayout,
      tiles: folderTiles,
    },
    layout: folderLayout,
    tiles: folderTiles,
  }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /^Folder Design system/ })).toBeVisible()
    await expect(canvas.getByRole('link', { name: /^Open Steam/ })).toBeVisible()
  }}
/>

<Story
  name='Narrow group'
  args={{ group: narrowGroup, layout: narrowLayout }}
  {template}
  play={async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Design system components' }),
    ).toBeVisible()
  }}
/>

<Story
  name='Manage context menu'
  {template}
  play={async ({ canvas }) => {
    const header = canvas.getByTestId('group-header')
    await fireEvent.contextMenu(header)
    // The context menu renders in a floating-ui portal on <body>, outside the story canvas,
    // so query it with screen rather than canvas (same pattern as Menus.stories.svelte).
    const item = await screen.findByRole('menuitem', { name: 'Rename folder' })
    // The menu content fades in (opacity transition); wait for it before asserting visibility.
    await waitFor(() => expect(item).toBeVisible())
    await userEvent.click(item)
    await expect(rename).toHaveBeenCalled()
  }}
/>

<Story
  name='Dock grid'
  args={{
    group: dockGroup,
    layout: dockLayout,
    tiles: dockTiles,
    rows: 2,
  }}
  {template}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Dock view' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
  }}
/>

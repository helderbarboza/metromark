<script
  module
  lang='ts'
>
  import MenuFixture from '$lib/stories/MenuFixture.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fireEvent, fn, screen, userEvent } from 'storybook/test'

  const edit = fn()
  const resize = fn()
  const { Story } = defineMeta({
    title: 'Molecules/Menus',
    component: MenuFixture,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: {
      variant: 'context',
      headingTitle: 'Steam',
      headingSubtitle: 'store.steampowered.com',
      items: [
        { label: 'Open in new tab', icon: 'openTab', action: fn() },
        { label: 'Edit bookmark', icon: 'edit', action: edit },
        { label: 'Delete bookmark', icon: 'delete', action: fn(), danger: true, separator: true },
      ],
    },
  })
</script>
<Story
  name='Tile actions'
  play={async ({ canvas }) => {
    await fireEvent.contextMenu(canvas.getByText('Right click here'))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit bookmark' }))
    await expect(edit).toHaveBeenCalled()
  }}
/>
<Story
  name='Tile size grid'
  args={{
    tileSize: 'medium',
    onresize: resize,
  }}
  play={async ({ canvas }) => {
    await fireEvent.contextMenu(canvas.getByText('Right click here'))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Resize to wide' }))
    await expect(resize).toHaveBeenCalledWith('wide')
  }}
/>
<Story
  name='Protected folder'
  args={{
    headingTitle: 'Bookmarks bar',
    headingSubtitle: 'Browser-owned root',
    tileSize: undefined,
    onresize: undefined,
    items: [
      { label: 'Add bookmark here', icon: 'addBookmark', action: fn() },
      { label: 'Rename folder', icon: 'edit', action: fn(), disabled: true },
      { label: 'Delete folder', icon: 'delete', action: fn(), danger: true, disabled: true },
    ],
  }}
/>
<Story
  name='Overflow dropdown'
  args={{
    variant: 'dropdown',
    items: [
      { label: 'Open in new tab', icon: 'openTab', action: fn() },
      { label: 'Open in new window', icon: 'openWindow', action: fn() },
      { label: 'Copy website address', icon: 'copy', action: fn() },
      { label: 'Customize tile', icon: 'customize', action: edit, separator: true },
    ],
  }}
  play={async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions for Steam' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Customize tile' }))
    await expect(edit).toHaveBeenCalled()
  }}
/>

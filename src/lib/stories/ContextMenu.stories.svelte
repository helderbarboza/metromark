<script
  module
  lang='ts'
>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'
  import ContextMenu from '../components/ContextMenu.svelte'

  const edit = fn()
  const { Story } = defineMeta({
    title: 'Metro/Context menu',
    component: ContextMenu,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: { x: 32, y: 32, title: 'Figma', subtitle: 'figma.com', onclose: fn(), size: 'large', onresize: fn(), items: [
      { label: 'Open in new tab', icon: 'external', action: fn() },
      { label: 'Edit bookmark', icon: 'edit', action: edit },
      { label: 'Delete bookmark', icon: 'trash', action: fn(), danger: true, separator: true },
    ] },
  })
</script>
<Story
  name='Tile actions'
  play={async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Edit bookmark' }))
    await expect(edit).toHaveBeenCalled()
  }}
/>
<Story
  name='Protected folder'
  args={{ title: 'Bookmarks bar', subtitle: 'Browser-owned root', size: undefined, onresize: undefined, items: [
    { label: 'Add bookmark here', icon: 'plus', action: fn() },
    { label: 'Rename folder', icon: 'edit', action: fn(), disabled: true },
    { label: 'Delete folder', icon: 'trash', action: fn(), danger: true, disabled: true },
  ] }}
/>

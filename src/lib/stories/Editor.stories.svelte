<script
  module
  lang='ts'
>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import EditorFixture from './EditorFixture.svelte'

  const { Story } = defineMeta({
    title: 'Metro/Bookmark editor',
    component: EditorFixture,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  })
</script>
<Story name='Add bookmark' />
<Story
  name='Edit bookmark'
  args={{ id: 'steam' }}
/>
<Story
  name='Create folder'
  args={{ kind: 'folder' }}
/>
<Story
  name='Customize tile'
  args={{ kind: 'appearance', id: 'steam' }}
/>
<Story
  name='Delete folder confirmation'
  args={{ kind: 'delete', id: 'learning' }}
/>
<Story
  name='Move bookmark'
  args={{ kind: 'move', id: 'steam' }}
/>
<Story
  name='Rename folder'
  args={{ kind: 'rename', id: 'learning' }}
/>
<Story
  name='Copy website address'
  args={{ kind: 'copy', id: 'steam' }}
/>
<Story
  name='Restore to folder'
  args={{ kind: 'restore', undoId: 'demo' }}
/>
<Story
  name='Settings drawer'
  args={{ kind: 'settings' }}
/>

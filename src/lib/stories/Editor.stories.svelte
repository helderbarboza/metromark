<script module
        lang='ts'
>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import EditorFixture from './EditorFixture.svelte'

  const { Story } = defineMeta({ title: 'Metro/Bookmark editor', component: EditorFixture, tags: ['autodocs'], parameters: { layout: 'fullscreen' } })
</script>
<Story name='Add bookmark' />
<Story name='Edit bookmark'
       args={{ id: 'figma' }}
/>
<Story name='Create folder'
       args={{ kind: 'folder' }}
/>
<Story name='Customize tile'
       args={{ kind: 'appearance', id: 'figma' }}
/>
<Story name='Delete folder confirmation'
       args={{ kind: 'delete', id: 'learning' }}
/>
<Story name='Move bookmark'
       args={{ kind: 'move', id: 'figma' }}
/>
<Story name='Settings drawer'
       args={{ kind: 'settings' }}
/>

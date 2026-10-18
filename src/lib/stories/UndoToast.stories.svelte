<script module
        lang='ts'
>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'
  import UndoToast from '../components/UndoToast.svelte'

  const undo = fn()
  const { Story } = defineMeta({ title: 'Metro/Undo and notifications', component: UndoToast, tags: ['autodocs'], parameters: { layout: 'fullscreen' }, args: { notice: { message: '“Figma” deleted', undoId: 'story-only' }, onundo: undo, onclose: fn() } })
</script>
<Story name='Destructive action'
       play={async ({ canvas }) => {
         await userEvent.click(canvas.getByRole('button', { name: 'Undo' }))
         await expect(undo).toHaveBeenCalled()
       }}
/>
<Story name='Conflict'
       args={{ notice: { message: 'This bookmark was edited elsewhere. Undo would overwrite that change.', tone: 'error' }, onundo: undefined }}
/>

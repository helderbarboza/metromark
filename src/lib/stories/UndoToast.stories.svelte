<script
  module
  lang='ts'
>
  import UndoToast from '$lib/components/UndoToast.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'

  const undo = fn()
  const { Story } = defineMeta({
    title: 'Molecules/Undo and notifications',
    component: UndoToast,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
      notice: { message: '“Steam” deleted', undoId: 'story-only' },
      onundo: undo,
      onclose: fn(),
    },
  })
</script>
<Story
  name='Destructive action'
  play={async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Undo' }))
    await expect(undo).toHaveBeenCalled()
  }}
/>
<Story
  name='Conflict'
  args={{
    notice: {
      message: 'This bookmark was edited elsewhere. Undo would overwrite that change.',
      tone: 'error',
    },
    onundo: undefined,
  }}
/>

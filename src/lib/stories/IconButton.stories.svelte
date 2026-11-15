<script
  module
  lang='ts'
>
  import Icon from '$lib/components/atoms/Icon.svelte'
  import IconButton from '$lib/components/molecules/IconButton.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'

  const clickFn = fn()

  const { Story } = defineMeta({
    title: 'Molecules/Icon button',
    component: IconButton,
    tags: ['autodocs'],
    args: {
      label: 'Close dialog',
      onclick: clickFn,
    },
  })
</script>

<Story
  name='Default'
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close dialog' })
    await expect(button).toBeInTheDocument()
    await expect(button).toHaveAttribute('aria-label', 'Close dialog')
    await userEvent.click(button)
    await expect(clickFn).toHaveBeenCalled()
  }}
>
  <Icon name='close' size={18} />
</Story>

<Story
  name='Dismiss notification'
  args={{ label: 'Dismiss notification' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Dismiss notification' })
    await expect(button).toHaveAttribute('aria-label', 'Dismiss notification')
    await expect(button.querySelector('svg')).toBeInTheDocument()
  }}
>
  <Icon name='close' size={14} />
</Story>

<Story
  name='Undo action'
  args={{ label: 'Undo last action' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Undo last action' })
    await expect(button).toHaveAttribute('aria-label', 'Undo last action')
  }}
>
  <Icon name='undo' size={18} />
</Story>

<Story
  name='Add bookmark'
  args={{ label: 'Add bookmark' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Add bookmark' })
    await expect(button).toHaveAttribute('aria-label', 'Add bookmark')
  }}
>
  <Icon name='addBookmark' size={18} />
</Story>

<Story
  name='Custom class merge'
  args={{ label: 'Close', class: 'toast-close' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close' })
    await expect(button).toHaveClass('toast-close')
  }}
>
  <Icon name='close' size={18} />
</Story>

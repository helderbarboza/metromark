<script
  module
  lang='ts'
>
  import Button from '$lib/components/Button.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'

  const clickFn = fn()

  const { Story } = defineMeta({
    title: 'Base/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
      type: 'button',
      onclick: clickFn,
    },
    argTypes: {
      variant: { control: 'radio', options: ['primary', 'danger'] },
      disabled: { control: 'boolean' },
    },
  })
</script>

<Story
  name='Default'
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' })
    await expect(button).toBeInTheDocument()
    await expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    await expect(clickFn).toHaveBeenCalled()
  }}
>
  Save changes
</Story>

<Story
  name='Primary'
  args={{ variant: 'primary' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Done' })
    await expect(button).toHaveClass('primary')
  }}
>
  Done
</Story>

<Story
  name='Danger'
  args={{ variant: 'danger' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Delete folder' })
    await expect(button).toHaveClass('danger')
    await expect(button.querySelector('svg')).toBeInTheDocument()
  }}
>
  <Icon name='delete' size={18} />
  Delete folder
</Story>

<Story
  name='Disabled'
  args={{ disabled: true }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' })
    await expect(button).toBeDisabled()
    const disabledClickFn = fn()
    await userEvent.click(button)
    await expect(disabledClickFn).not.toHaveBeenCalled()
  }}
>
  Save changes
</Story>

<Story
  name='Submit type'
  args={{ type: 'submit' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' })
    await expect(button).toHaveAttribute('type', 'submit')
  }}
>
  Save changes
</Story>

<Story
  name='With icon'
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Add bookmark' })
    await expect(button.querySelector('svg')).toBeInTheDocument()
  }}
>
  <Icon name='addBookmark' size={18} />
  Add bookmark
</Story>

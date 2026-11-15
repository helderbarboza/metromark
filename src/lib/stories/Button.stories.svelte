<script
  module
  lang='ts'
>
  import Icon from '$lib/components/atoms/Icon.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'

  const clickFn = fn()

  const { Story } = defineMeta({
    title: 'Atoms/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
      type: 'button',
      onclick: clickFn,
    },
    argTypes: {
      variant: {
        control: 'radio',
        options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      },
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
  name='Secondary'
  args={{ variant: 'secondary' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Done' })
    await expect(button).toHaveClass('bg-secondary')
  }}
>
  Done
</Story>

<Story
  name='Destructive'
  args={{ variant: 'destructive' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Delete folder' })
    await expect(button).toHaveClass('bg-destructive')
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

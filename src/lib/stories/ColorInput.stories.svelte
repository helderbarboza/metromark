<script
  module
  lang='ts'
>
  import ColorInput from '$lib/components/atoms/ColorInput.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect } from 'storybook/test'

  const { Story } = defineMeta({
    title: 'Atoms/ColorInput',
    component: ColorInput,
    tags: ['autodocs'],
    args: {
      value: '#40a02b',
      ariaLabel: 'Custom tile color',
    },
  })
</script>

<Story
  name='Default'
  play={async ({ canvasElement }) => {
    const input = canvasElement.querySelector('input')
    await expect(input).toHaveValue('#40a02b')
  }}
/>

<Story
  name='Disabled'
  args={{ disabled: true }}
  play={async ({ canvasElement }) => {
    const input = canvasElement.querySelector('input')
    await expect(input).toBeDisabled()
  }}
/>

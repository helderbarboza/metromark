<script
  module
  lang='ts'
>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect } from 'storybook/test'
  import IconConvertPlayground from './IconConvertPlayground.svelte'

  const { Story } = defineMeta({
    title: 'Metro/Icon convert playground',
    component: IconConvertPlayground,
    tags: ['autodocs'],
    args: {
      size: 64,
      tint: '#ff0000',
      filled: true,
      bg: '#ffffff',
      iconShape: -1,
      preserveTransparency: false,
      clipGlyphToShape: false,
      src: '/icons/128.png',
    },
    argTypes: {
      size: { control: { type: 'number', min: 16, max: 128, step: 8 } },
      tint: { control: 'color' },
      filled: { control: 'boolean' },
      bg: { control: 'color' },
      iconShape: { control: 'radio', options: [-1, 0, 1, 2] },
      preserveTransparency: { control: 'boolean' },
      clipGlyphToShape: { control: 'boolean' },
      src: { control: 'text' },
    },
  })
</script>

<Story
  name='Default'
  play={async ({ canvas }) => {
    await expect(canvas.getByAltText('Original icon')).toBeVisible()
    await expect(await canvas.findByAltText('Converted icon')).toBeVisible()
  }}
/>
<Story
  name='Outline variant'
  args={{ filled: false }}
/>
<Story
  name='Circle clip'
  args={{ iconShape: 0 }}
/>
<Story
  name='Rounded rect'
  args={{ iconShape: 1 }}
/>

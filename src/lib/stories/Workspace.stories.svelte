<script module lang='ts'>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, userEvent } from 'storybook/test'
  import AppFixture from './AppFixture.svelte'

  const { Story } = defineMeta({
    title: 'Metro/Workspace',
    component: AppFixture,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  })
</script>

<Story
  name='Midnight'
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible()
  }}
/>
<Story
  name='Catppuccin Latte'
  args={{ theme: 'catppuccin-latte' }}
/>
<Story
  name='Tokyo Night Dark compact'
  args={{ theme: 'tokyo-night-dark', compact: true }}
/>
<Story
  name='Search interaction'
  play={async ({ canvas }) => {
    const input = await canvas.findByRole('searchbox', { name: 'Search bookmarks' })
    await userEvent.type(input, 'Figma')
    await expect(await canvas.findByRole('link', { name: /^Open Figma/ })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: /^Open Slack/ })).not.toBeInTheDocument()
  }}
/>
<Story
  name='Empty search'
  play={async ({ canvas }) => {
    const input = await canvas.findByRole('searchbox', { name: 'Search bookmarks' })
    await userEvent.type(input, 'does-not-exist')
    await expect(await canvas.findByText('No favorites found.')).toBeVisible()
  }}
/>

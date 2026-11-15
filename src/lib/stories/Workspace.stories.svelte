<script module lang='ts'>
  import AppFixture from '$lib/stories/AppFixture.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, userEvent } from 'storybook/test'

  const { Story } = defineMeta({
    title: 'Organisms/Workspace',
    component: AppFixture,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  })
</script>

<Story
  name='Midnight'
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
  }}
/>
<Story
  name='Catppuccin Latte'
  globals={{ theme: 'catppuccin-latte' }}
/>
<Story
  name='Tokyo Night Moon compact'
  globals={{ theme: 'tokyo-night-moon' }}
  args={{ compact: true }}
/>
<Story
  name='Search interaction'
  play={async ({ canvas }) => {
    const input = await canvas.findByRole('searchbox', { name: 'Search bookmarks' })
    await userEvent.type(input, 'Steam')
    await expect(await canvas.findByRole('link', { name: /^Open Steam/ })).toBeVisible()
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

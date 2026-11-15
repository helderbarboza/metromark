<script
  module
  lang='ts'
>
  import FaviconIcon from '$lib/components/atoms/FaviconIcon.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  const { Story } = defineMeta({
    title: 'Atoms/FaviconIcon',
    component: FaviconIcon,
    tags: ['autodocs'],
    args: {
      class: 'size-16',
    },
  })
</script>

<Story name='Pending' args={{ status: 'pending' }} />

<Story
  name='Ready'
  args={{
    status: 'ready',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%228%22 cy=%228%22 r=%228%22 fill=%22%23107c10%22/%3E%3C/svg%3E',
  }}
/>

<Story name='Failed' args={{ status: 'failed' }} />

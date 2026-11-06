<script
  module
  lang='ts'
>
  import SettingsRow from '$lib/components/editor/SettingsRow.svelte'
  import { Button } from '$lib/components/ui/button'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, fn, userEvent } from 'storybook/test'

  const browse = fn()

  const STICKERS_HELP = 'To add stickers, select Personalize your background > Picture '
    + 'and choose Fill for your desktop image.'

  const { Story } = defineMeta({
    title: 'Base/Settings row',
    component: SettingsRow,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
  })
</script>

<Story
  name='Button action'
  asChild
  play={async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Browse photos' }))
    await expect(browse).toHaveBeenCalled()
  }}
>
  <div class='w-180 max-w-full border border-(--border)'>
    <SettingsRow title='Choose a photo'>
      <Button variant='secondary' onclick={browse}>Browse photos</Button>
    </SettingsRow>
  </div>
</Story>

<Story
  name='Select control'
  asChild
  play={async ({ canvas }) => {
    const select = canvas.getByRole('combobox', { name: 'Choose a fit for your desktop image' })
    await expect(select).toHaveValue('stretch')
  }}
>
  <div class='w-180 max-w-full border border-(--border)'>
    <SettingsRow title='Choose a fit for your desktop image' controlId='fit'>
      <select
        id='fit'
        class='
          h-9 w-32 rounded-sm border border-(--border) bg-(--secondary) px-3 text-sm
          text-(--foreground)
        '
      >
        <option value='fill'>Fill</option>
        <option value='fit'>Fit</option>
        <option value='stretch' selected>Stretch</option>
        <option value='tile'>Tile</option>
      </select>
    </SettingsRow>
  </div>
</Story>

<Story name='Switch control' asChild>
  <div class='w-180 max-w-full border border-(--border)'>
    <SettingsRow
      title='Show accent color on Start and taskbar'
      controlId='accent-start'
    >
      <label for='accent-start' class='flex cursor-pointer items-center gap-2.5 text-sm'>
        <span>Off</span>
        <input
          id='accent-start'
          type='checkbox'
          role='switch'
          aria-labelledby='accent-start-title'
          class='
            h-5.5 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
            p-0.75
            before:block before:size-4 before:rounded-full before:bg-(--muted-foreground)
            before:transition-transform before:duration-130
            checked:bg-(--primary)
            checked:before:translate-x-5.5 checked:before:bg-(--primary-foreground)
          '
        />
      </label>
    </SettingsRow>
  </div>
</Story>

<Story
  name='Disabled row'
  asChild
  play={async ({ canvas }) => {
    const row = canvas.getByText('Choose stickers for your wallpaper').closest('[aria-disabled]')
    await expect(row).toHaveAttribute('aria-disabled', 'true')
    await expect(canvas.getByRole('button', { name: 'Add stickers' })).toBeDisabled()
  }}
>
  <div class='w-180 max-w-full border border-(--border)'>
    <SettingsRow
      title='Choose stickers for your wallpaper'
      helpText={STICKERS_HELP}
      disabled
    >
      <Button variant='secondary' disabled>Add stickers</Button>
    </SettingsRow>
  </div>
</Story>

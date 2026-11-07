<script
  module
  lang='ts'
>
  import SettingsCard from '$lib/components/editor/SettingsCard.svelte'
  import SettingsCardSwitchFixture from '$lib/stories/SettingsCardSwitchFixture.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, userEvent } from 'storybook/test'

  const { Story } = defineMeta({
    title: 'Base/Settings card',
    component: SettingsCard,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
  })
</script>

<Story
  name='Select control'
  asChild
  play={async ({ canvas }) => {
    const select = canvas.getByRole('combobox', { name: 'Choose your mode' })
    await expect(select).toHaveValue('dark')
  }}
>
  <div class='w-180 max-w-full'>
    <SettingsCard
      icon='customize'
      title='Choose your mode'
      helpText='Change the colors that appear in Windows and your apps'
      controlId='mode'
    >
      <select
        id='mode'
        aria-describedby='mode-help'
        class='
          h-9 w-32 rounded-sm border border-(--border) bg-(--secondary) px-3 text-sm
          text-(--foreground)
        '
      >
        <option value='light'>Light</option>
        <option value='dark' selected>Dark</option>
        <option value='system'>System</option>
      </select>
    </SettingsCard>
  </div>
</Story>

<Story
  name='Switch control'
  asChild
  play={async ({ canvas }) => {
    const toggle = canvas.getByRole('switch', { name: 'Transparency effects' })
    await expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    await expect(toggle).not.toBeChecked()
    await expect(canvas.getByText('Off')).toBeVisible()
  }}
>
  <SettingsCardSwitchFixture
    icon='settings'
    title='Transparency effects'
    helpText='Windows and surfaces appear translucent'
    controlId='transparency'
  />
</Story>

<Story name='Without help text' asChild>
  <SettingsCardSwitchFixture
    icon='globe'
    title='Open links in a new tab'
    controlId='new-tab'
  />
</Story>

<Story name='Long help text' asChild>
  <div class='w-180 max-w-full'>
    <SettingsCard
      icon='settings'
      title='Background effects'
      helpText='Animated backgrounds can use more battery. Metro lowers the frame rate when hidden.'
      controlId='effects'
    >
      <select
        id='effects'
        aria-describedby='effects-help'
        class='
          h-9 w-32 rounded-sm border border-(--border) bg-(--secondary) px-3 text-sm
          text-(--foreground)
        '
      >
        <option value='auto' selected>Auto</option>
        <option value='off'>Off</option>
      </select>
    </SettingsCard>
  </div>
</Story>

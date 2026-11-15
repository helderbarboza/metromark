<script
  module
  lang='ts'
>
  import CollapsibleSection from '$lib/components/editor/CollapsibleSection.svelte'
  import SettingsRow from '$lib/components/editor/SettingsRow.svelte'
  import { Button } from '$lib/components/ui/button'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { expect, userEvent } from 'storybook/test'

  const { Story } = defineMeta({
    title: 'Molecules/Collapsible section',
    component: CollapsibleSection,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
  })

  const THEME_HELP = 'Choose a combination of wallpapers, sounds, and colors together '
    + 'to give your desktop more personality'
  const BACKGROUND_HELP = 'A picture background applies to your current desktop. '
    + 'Solid color or slideshow backgrounds apply to all your desktops.'
  const STICKERS_HELP = 'To add stickers, select Personalize your background > Picture '
    + 'and choose Fill for your desktop image.'
  const RECENT_COLORS = [
    '#8a5a3b',
    '#5f5f5f',
    '#107c10',
    '#c0504d',
    '#9b59b6',
    '#111111',
    '#e81123',
    '#0078d7',
    '#ffd700',
  ]
  const WINDOWS_COLORS = [
    '#ffb900',
    '#ff8c00',
    '#e81123',
    '#0078d7',
    '#107c10',
    '#881798',
    '#00b7c3',
    '#767676',
    '#4caf50',
  ]
</script>

{#snippet themeCard(color: string)}
  <div
    class='flex size-20 items-end rounded-sm border border-(--border) p-2'
    style:background={color}
    aria-hidden='true'
  >
    <span class='flex size-8 items-center justify-center rounded-sm bg-white/90'>
      <span class='h-2 w-5 rounded-full bg-(--primary)'></span>
    </span>
  </div>
{/snippet}

{#snippet colorSwatch(color: string)}
  <span
    class='size-10 rounded-sm border border-(--border)'
    style:background={color}
    aria-hidden='true'
  ></span>
{/snippet}

{#snippet switchControl(id: string, titleId: string, on: boolean)}
  <label for={id} class='flex cursor-pointer items-center gap-2.5 text-sm'>
    <span>{on ? 'On' : 'Off'}</span>
    <input
      {id}
      type='checkbox'
      role='switch'
      aria-labelledby={titleId}
      checked={on}
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
{/snippet}

<Story
  name='Theme field'
  asChild
  play={async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Current theme' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  }}
>
  <div class='w-180 max-w-full'>
    <CollapsibleSection
      icon='customize'
      title='Current theme'
      helpText={THEME_HELP}
      value='Custom'
      open
    >
      <div class='p-4'>
        <p class='mb-2.5 text-xs text-(--muted-foreground)'>Recent themes</p>
        <div class='flex flex-wrap gap-2'>
          {#each ['#2b2b2b', '#1f1f1f', '#3b3b3b', '#0a2a4a', '#4a1f1f'] as color (color)}
            {@render themeCard(color)}
          {/each}
        </div>
      </div>
      <SettingsRow title='Get more themes from Microsoft Store'>
        <Button variant='secondary'>Browse themes</Button>
      </SettingsRow>
    </CollapsibleSection>
  </div>
</Story>

<Story
  name='Accent color'
  asChild
  play={async ({ canvas }) => {
    const select = canvas.getByRole('combobox', { name: 'Accent color' })
    await expect(select).toHaveValue('manual')
  }}
>
  <div class='w-180 max-w-full'>
    <CollapsibleSection icon='settings' title='Accent color'>
      {#snippet control({ titleId })}
        <select
          aria-labelledby={titleId}
          class='
            h-9 w-32 rounded-sm border border-(--border) bg-(--secondary) px-3 text-sm
            text-(--foreground)
          '
        >
          <option value='manual' selected>Manual</option>
          <option value='auto'>Automatic</option>
        </select>
      {/snippet}
      <div class='grid gap-5 p-4'>
        <div>
          <p class='mb-2.5 text-xs text-(--muted-foreground)'>Recent colors</p>
          <div class='flex flex-wrap gap-1'>
            {#each RECENT_COLORS as color (color)}
              {@render colorSwatch(color)}
            {/each}
          </div>
        </div>
        <div>
          <p class='mb-2.5 text-xs text-(--muted-foreground)'>Windows colors</p>
          <div class='flex flex-wrap gap-1'>
            {#each WINDOWS_COLORS as color (color)}
              {@render colorSwatch(color)}
            {/each}
          </div>
        </div>
      </div>
      <SettingsRow title='Custom colors'>
        <Button variant='secondary'>View colors</Button>
      </SettingsRow>
      <SettingsRow
        title='Show accent color on Start and taskbar'
        controlId='accent-start'
      >
        {@render switchControl('accent-start', 'accent-start-title', false)}
      </SettingsRow>
      <SettingsRow
        title='Show accent color on title bars and windows borders'
        controlId='accent-borders'
      >
        {@render switchControl('accent-borders', 'accent-borders-title', true)}
      </SettingsRow>
    </CollapsibleSection>
  </div>
</Story>

<Story
  name='Background'
  asChild
  play={async ({ canvas }) => {
    const select = canvas.getByRole('combobox', { name: 'Personalize your background' })
    await expect(select).toHaveValue('picture')
    await expect(canvas.getByRole('button', { name: 'Add stickers' })).toBeDisabled()
  }}
>
  <div class='w-180 max-w-full'>
    <CollapsibleSection
      icon='globe'
      title='Personalize your background'
      helpText={BACKGROUND_HELP}
      open
    >
      {#snippet control({ titleId })}
        <select
          aria-labelledby={titleId}
          class='
            h-9 w-32 rounded-sm border border-(--border) bg-(--secondary) px-3 text-sm
            text-(--foreground)
          '
        >
          <option value='picture' selected>Picture</option>
          <option value='solid'>Solid color</option>
          <option value='slideshow'>Slideshow</option>
        </select>
      {/snippet}
      <div class='p-4'>
        <p class='mb-2.5 text-xs text-(--muted-foreground)'>Recent images</p>
        <div class='flex gap-2'>
          <div
            class='
              size-20 rounded-sm border border-(--border) bg-linear-to-br from-sky-700
              to-slate-300
            '
            aria-hidden='true'
          ></div>
          <div
            class='
              size-20 rounded-sm border border-(--border) bg-linear-to-br from-red-700
              to-rose-950
            '
            aria-hidden='true'
          ></div>
        </div>
      </div>
      <SettingsRow title='Choose a photo'>
        <Button variant='secondary'>Browse photos</Button>
      </SettingsRow>
      <SettingsRow title='Choose a fit for your desktop image' controlId='background-fit'>
        <select
          id='background-fit'
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
      <SettingsRow
        title='Choose stickers for your wallpaper'
        helpText={STICKERS_HELP}
        disabled
      >
        <Button variant='secondary' disabled>Add stickers</Button>
      </SettingsRow>
    </CollapsibleSection>
  </div>
</Story>

<Story name='Collapsed' asChild>
  <div class='w-180 max-w-full'>
    <CollapsibleSection
      icon='customize'
      title='Current theme'
      helpText={THEME_HELP}
      value='Custom'
      open={false}
    >
      <SettingsRow title='Get more themes from Microsoft Store'>
        <Button variant='secondary'>Browse themes</Button>
      </SettingsRow>
    </CollapsibleSection>
  </div>
</Story>

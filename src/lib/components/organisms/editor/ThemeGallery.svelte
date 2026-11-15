<script lang='ts'>
  import type { ThemeSelections } from '$lib/theme-picker'
  import ThemePreview from '$lib/components/molecules/ThemePreview.svelte'
  import {
    DARK_THEMES,
    getThemeSelections,
    isOneOf,
    LIGHT_THEMES,
    setThemeForMode,

  } from '$lib/theme-picker'
  import { getTheme } from '$lib/themes.js'
  import Button from '../../ui/button/button.svelte'

  interface Props {
    themes: ThemeSelections
  }

  let { themes: currentThemes = $bindable() }: Props = $props()

  const themeGroupsEntries = [['light', LIGHT_THEMES], ['dark', DARK_THEMES]] as const

  function chooseTheme(targetMode: 'light' | 'dark', newTheme: string): void {
    if (targetMode === 'light' && isOneOf(newTheme, LIGHT_THEMES)) {
      setThemeForMode('light', newTheme)
    }
    else if (targetMode === 'dark' && isOneOf(newTheme, DARK_THEMES)) {
      setThemeForMode('dark', newTheme)
    }

    currentThemes = getThemeSelections()
  }

</script>

<div class='flex flex-col gap-5'>
  {#each themeGroupsEntries as [mode, modeTheme] (mode)}
    <div>
      <h4
        class='
          mb-2.5 text-xs font-[550] tracking-[0.5px] text-(--muted-foreground) uppercase
        '
      >{mode} theme</h4>
      <div class='grid grid-cols-3 gap-2'>
        {#each modeTheme as theme (theme)}
          {@const selected = currentThemes[mode] === theme}
          {@const label = getTheme(theme)?.label ?? theme}
          <Button
            type='button'
            class='flex h-auto flex-col items-start gap-0 truncate p-px text-left'
            aria-pressed={selected}
            variant={selected ? 'default' : 'secondary'}
            onclick={() => chooseTheme(mode, theme)}
          >
            <div class='w-full overflow-hidden'>
              <ThemePreview {theme} {mode} />
            </div>
            <span class='w-full items-center justify-between truncate p-2 text-xs'>
              {label}
            </span>
          </Button>
        {/each}
      </div>
    </div>
  {/each}
</div>

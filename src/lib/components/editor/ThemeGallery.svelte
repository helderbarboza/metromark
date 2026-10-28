<script lang='ts'>
  import ThemePreview from '$lib/components/editor/ThemePreview.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import {
    DARK_THEMES,
    getThemeSelections,
    isOneOf,
    LIGHT_THEMES,
    setThemeForMode,
  } from '$lib/theme-picker'

  const themeGroupsEntries = [['light', LIGHT_THEMES], ['dark', DARK_THEMES]] as const

  let selections = $state(getThemeSelections())

  function chooseTheme(targetMode: 'light' | 'dark', newTheme: string): void {
    if (targetMode === 'light' && isOneOf(newTheme, LIGHT_THEMES)) {
      setThemeForMode('light', newTheme)
    }
    else if (targetMode === 'dark' && isOneOf(newTheme, DARK_THEMES)) {
      setThemeForMode('dark', newTheme)
    }

    selections = getThemeSelections()
  }
</script>

<div class='flex flex-col gap-5'>
  {#each themeGroupsEntries as [mode, modeTheme] (mode)}
    <div>
      <h4
        class='
          mb-[10px] text-[11px] font-[550] tracking-[0.5px] text-(--muted) uppercase
        '
      >{mode} theme</h4>
      <div class='grid grid-cols-2 gap-[10px]'>
        {#each modeTheme as theme (theme)}
          {@const selected = selections[mode] === theme}
          <button
            type='button'
            class='
              overflow-hidden rounded-sm border border-(--line) bg-transparent text-left
              aria-pressed:border-(--accent)
            '
            aria-pressed={selected}
            onclick={() => chooseTheme(mode, theme)}
          >
            <ThemePreview {theme} {mode} />
            <span class='flex items-center justify-between px-[11px] py-[9px] text-[10px]'>
              {theme}
              {#if selected}<Icon name='check' size={12} />{/if}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

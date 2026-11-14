<script lang='ts'>
  import type { ThemeMode } from '$lib/theme-picker'
  import { applyThemeForMode } from '$lib/theme-picker'
  import { mode, ModeWatcher, theme } from 'mode-watcher'

  let themeColorProbe: HTMLSpanElement
  let lastAppliedMode = $state<ThemeMode | null>(null)

  $effect(() => {
    const resolvedMode = mode.current
    if (!resolvedMode || resolvedMode === lastAppliedMode)
      return
    lastAppliedMode = resolvedMode
    applyThemeForMode(resolvedMode)
  })

  $effect(() => {
    const activeTheme = theme.current
    if (!activeTheme || !themeColorProbe)
      return

    const color = getComputedStyle(themeColorProbe).backgroundColor
    if (!color || color === 'rgba(0, 0, 0, 0)')
      return

    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', color)
  })
</script>

<ModeWatcher
  defaultMode='system'
  disableHeadScriptInjection
  synchronousModeChanges
/>
<span
  bind:this={themeColorProbe}
  class='pointer-events-none fixed hidden size-px bg-(--background)'
  aria-hidden='true'
>
</span>

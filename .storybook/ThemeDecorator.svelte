<script lang='ts'>
  import type { Component } from 'svelte'
  import { getTheme } from '$lib/themes.js'
  import { onMount, tick } from 'svelte'

  /**
   * Svelte CSF decorator. Applies the theme directly to <html> (data-theme,
   * .dark, color-scheme) — the same work init-mode.js does before paint.
   * Going through mode-watcher does not work here: its DOM sync is a lazy
   * $derived that only runs when something reads it, and component stories
   * never read theme.current. The mode-watcher store is intentionally left
   * alone: the theme is a storybook-level presentation detail, components
   * that want it read documentElement instead.
   */
  interface StoryResult { Component?: Component, props?: Record<string, unknown> }

  const { story, theme }: { story: StoryResult, theme: string } = $props()

  let mounted = false
  async function applyTheme(value: string) {
    // tick() runs after all pending effects/mounts commit, so the child
    // tree (App -> ModeWatcher) has applied its stale read of localStorage
    // before we overwrite data-theme with the story's theme.
    await tick()
    if (!mounted)
      return
    const entry = getTheme(value) ?? getTheme('catppuccin-mocha')
    if (!entry)
      return
    const root = document.documentElement
    root.setAttribute('data-theme', entry.name)
    root.style.colorScheme = entry.mode
    root.classList.toggle('dark', entry.mode === 'dark')
  }

  onMount(() => {
    mounted = true
    applyTheme(theme)
  })

  $effect(() => {
    void theme
    if (mounted)
      applyTheme(theme)
  })
</script>

<story.Component {...story.props} />

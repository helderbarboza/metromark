<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import type { GridView } from '$lib/layout'
  import type { LanguageSetting } from '$lib/locale'
  import type { ThemeSelections } from '$lib/theme-picker'
  import type { Command, Settings } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import CollapsibleSection from '$lib/components/molecules/CollapsibleSection.svelte'
  import DialogError from '$lib/components/molecules/DialogError.svelte'
  import SettingsCard from '$lib/components/molecules/SettingsCard.svelte'
  import { createDialogCommand } from '$lib/components/organisms/editor/dialog-command.svelte'
  import ThemeGallery from '$lib/components/organisms/editor/ThemeGallery.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Select from '$lib/components/ui/select'
  import { Switch } from '$lib/components/ui/switch'
  import * as Tabs from '$lib/components/ui/tabs'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { GRID_VIEW_IDS, isGridView } from '$lib/layout'
  import { APP_LOCALES, isLanguageSetting, LANGUAGE_NATIVE_NAMES, resolveLocale } from '$lib/locale'
  import { setSettingsContext } from '$lib/settings-context'
  import { getThemeSelections } from '$lib/theme-picker'
  import { getTheme } from '$lib/themes.js'
  import { setMode, systemPrefersMode, userPrefersMode } from 'mode-watcher'
  import BackgroundSettings from './BackgroundSettings.svelte'

  interface Props {
    settings: Settings
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
    onresetpreview?: () => Promise<void>
  }

  const {
    settings,
    oncommand,
    onclose,
    onresetpreview,
  }: Props = $props()

  const { state: command, send, run } = createDialogCommand(
    command => oncommand(command),
    () => onclose(),
  )

  const densities = ['comfortable', 'compact'] as const
  const gridViews = GRID_VIEW_IDS
  const gridViewLabels: Record<GridView, () => string> = {
    classic: $LL.settings.classic,
    dock: $LL.settings.dock,
  }
  const modes = ['system', 'light', 'dark'] as const

  let confirmReset = $state(false)
  let confirmFactory = $state(false)
  let confirmPreview = $state(false)

  async function setting(patch: Partial<Settings>) {
    await send({ type: 'settings.update', patch }, false)
  }

  // Provide settings to the dialog subtree (e.g. the Background tab) as a
  // getter closure so consumers stay reactive without prop drilling.
  setSettingsContext(() => ({
    settings,
    busy: command.busy,
    update: patch => void setting(patch),
  }))

  async function resetPreview() {
    await run(async () => {
      await onresetpreview?.()
      onclose()
    })
  }

  const isPreview = $derived(typeof onresetpreview === 'function')
  const tabs: { value: string, icon: IconName, label: string }[] = $derived([
    {
      value: 'general',
      icon: 'settings',
      label: $LL.settings.tabGeneral(),
    },
    {
      value: 'appearance',
      icon: 'paintBrush',
      label: $LL.settings.tabAppearance(),
    },
    {
      value: 'tiles',
      icon: 'layoutCellFour',
      label: $LL.settings.tabTiles(),
    },
    {
      value: 'background',
      icon: 'image',
      label: $LL.settings.tabBackground(),
    },
    {
      value: 'advanced',
      icon: 'buildingFactory',
      label: $LL.settings.tabAdvanced(),
    },
  ])

  let themes: ThemeSelections = $state(getThemeSelections())

  const systemsCaption = $derived(
    systemPrefersMode.current === 'dark'
      ? $LL.settings.dark()
      : $LL.settings.light(),
  )
  const detectedLanguage = $derived(
    LANGUAGE_NATIVE_NAMES[resolveLocale('auto')],
  )
  const languageLabel = $derived(
    settings.language === 'auto'
      ? $LL.settings.systemLanguage({ language: detectedLanguage })
      : LANGUAGE_NATIVE_NAMES[settings.language],
  )
  const layoutsHelp = $derived(
    confirmReset
      ? $LL.settings.confirmResetHelp()
      : $LL.settings.layoutsHelp(),
  )
  const factoryHelp = $derived(
    confirmFactory
      ? $LL.settings.confirmFactoryHelp()
      : $LL.settings.factoryHelp(),
  )
</script>

<Tabs.Root value={tabs[0].value} orientation='vertical' class='relative ml-4 min-h-0 flex-1 gap-0 divide-x'>

  <Tabs.List
    variant='line'
    class='
      h-full! min-w-35 shrink-0 scrollbar-thin justify-start overflow-y-auto py-2 pr-2
      max-sm:min-w-20
    '
  >
    {#each tabs as { value, label, icon } (value)}
      <Tabs.Trigger {value} class='grow-0 text-xs after:-left-1'>
        <Icon name={icon} />
        {label}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>

  <div
    class='
      min-h-0 min-w-0 flex-1 scrollbar-thin scrollbar-gutter-stable overflow-y-auto px-4
      pt-2 pb-4
      *:grid *:animate-rise-enter *:gap-1
      max-sm:px-2
    '
  >
    <Tabs.Content value='general'>
      <SettingsCard
        icon='translate'
        title={$LL.settings.language()}
        helpText={$LL.settings.languageHelp()}
        controlId='language'
      >
        <Select.Root
          type='single'
          value={settings.language}
          disabled={command.busy}
          onValueChange={(v) => {
            if (isLanguageSetting(v)) {
              const language: LanguageSetting = v
              setting({ language })
            }
          }}
        >
          <Select.Trigger
            id='language'
            class='w-full max-w-42'
            aria-labelledby='language-title'
            aria-describedby='language-help'
          >
            <div class='truncate'>{languageLabel}</div>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Item value='auto'>
                {$LL.settings.systemLanguage({ language: detectedLanguage })}
              </Select.Item>
              {#each APP_LOCALES as lang (lang)}
                <Select.Item value={lang}>{LANGUAGE_NATIVE_NAMES[lang]}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </SettingsCard>
      <SettingsCard
        icon='pause'
        title={$LL.settings.reduceMotion()}
        helpText={$LL.settings.reduceMotionHelp()}
        controlId='reduce-motion'
      >
        <Switch
          id='reduce-motion'
          aria-labelledby='reduce-motion-title'
          aria-describedby='reduce-motion-help'
          checked={settings.reducedMotion}
          disabled={command.busy}
          onCheckedChange={reducedMotion => setting({ reducedMotion })}
        />
      </SettingsCard>
    </Tabs.Content>

    <Tabs.Content value='appearance'>
      <SettingsCard
        icon='darkTheme'
        title={$LL.settings.mode()}
        helpText={$LL.settings.modeHelp()}
        controlId='app-mode'
      >
        <ToggleGroup.Root
          type='single'
          value={userPrefersMode.current}
          onValueChange={(v) => {
            // bits-ui passes a bare string; mode-watcher only accepts known modes.
            if (v === 'light' || v === 'dark' || v === 'system')
              setMode(v)
          }}
          id='app-mode'
          aria-labelledby='app-mode-title'
          aria-describedby='app-mode-help'
        >
          {#each modes as mode (mode)}
            <ToggleGroup.Item
              value={mode}
              class={mode === 'system'
                ? 'grow'
                : 'grow capitalize'}
            >
              {mode === 'system'
                ? $LL.settings.systemMode({ mode: systemsCaption })
                : $LL.settings[mode]()}
            </ToggleGroup.Item>
          {/each}
        </ToggleGroup.Root>
      </SettingsCard>

      <CollapsibleSection
        icon='color'
        title={$LL.settings.themes()}
        helpText={$LL.settings.themesHelp()}
      >
        {#snippet control()}
          <div class='inline-flex flex-col text-right text-xs'>
            <span>{getTheme(themes.light)?.label ?? themes.light}</span>
            <span>{getTheme(themes.dark)?.label ?? themes.dark}</span>
          </div>
        {/snippet}
        <div class='p-4'>
          <ThemeGallery bind:themes />
        </div>
      </CollapsibleSection>
    </Tabs.Content>

    <Tabs.Content value='tiles'>
      <SettingsCard
        icon='layoutCellFour'
        title={$LL.settings.gridView()}
        helpText={$LL.settings.gridViewHelp()}
        controlId='grid-view'
      >
        <ToggleGroup.Root
          type='single'
          id='grid-view'
          aria-labelledby='grid-view-title'
          aria-describedby='grid-view-help'
          value={settings.gridView}
          disabled={command.busy}
          onValueChange={(v) => {
            if (!isGridView(v))
              return
            setting({ gridView: v })
          }}
        >
          {#each gridViews as view (view)}
            <ToggleGroup.Item value={view} class='grow'>
              {gridViewLabels[view]()}
            </ToggleGroup.Item>
          {/each}
        </ToggleGroup.Root>
      </SettingsCard>
      <SettingsCard
        icon='density'
        title={$LL.settings.tileDensity()}
        helpText={$LL.settings.tileDensityHelp()}
        controlId='tile-density'
      >
        <ToggleGroup.Root
          type='single'
          id='tile-density'
          aria-labelledby='tile-density-title'
          aria-describedby='tile-density-help'
          value={settings.density}
          disabled={command.busy}
          onValueChange={(v) => {
            if (v !== 'comfortable' && v !== 'compact')
              return
            setting({ density: v })
          }}
        >
          {#each densities as density (density)}
            <ToggleGroup.Item value={density} class='grow'>
              {density === 'comfortable'
                ? $LL.settings.comfortable()
                : $LL.settings.compact()}
            </ToggleGroup.Item>
          {/each}
        </ToggleGroup.Root>
      </SettingsCard>
      <SettingsCard
        icon='link'
        title={$LL.settings.showAddresses()}
        helpText={$LL.settings.showAddressesHelp()}
        controlId='show-domains'
      >
        <Switch
          id='show-domains'
          aria-labelledby='show-domains-title'
          aria-describedby='show-domains-help'
          checked={settings.showDomains}
          disabled={command.busy}
          onCheckedChange={showDomains => setting({ showDomains })}
        />
      </SettingsCard>
      <SettingsCard
        icon='imageGlobe'
        title={$LL.settings.originalFavicons()}
        helpText={$LL.settings.originalFaviconsHelp()}
        controlId='original-favicons'
      >
        <Switch
          id='original-favicons'
          aria-labelledby='original-favicons-title'
          aria-describedby='original-favicons-help'
          checked={settings.originalFavicons}
          disabled={command.busy}
          onCheckedChange={originalFavicons => setting({ originalFavicons })}
        />
      </SettingsCard>
      <SettingsCard
        icon='arrowReset'
        title={$LL.settings.resetLayouts()}
        helpText={layoutsHelp}
        controlId='reset-layouts'
      >
        {#if confirmReset}
          <Button onclick={() => (confirmReset = false)}>{$LL.dialogs.cancel()}</Button>
          <Button
            variant='default'
            disabled={command.busy}
            aria-describedby='reset-layouts-help'
            onclick={() => send({ type: 'layout.reset' })}
          >
            {$LL.settings.resetWithUndo()}
          </Button>
        {:else}
          <Button id='reset-layouts' onclick={() => (confirmReset = true)}>
            {$LL.settings.resetLayouts()}
          </Button>
        {/if}
      </SettingsCard>
    </Tabs.Content>
    <Tabs.Content value='background'>
      <BackgroundSettings />
    </Tabs.Content>
    <Tabs.Content value='advanced'>
      <SettingsCard
        icon='buildingFactory'
        title={$LL.settings.factoryReset()}
        helpText={factoryHelp}
        controlId='factory-reset'
      >
        {#if confirmFactory}
          <Button disabled={command.busy} onclick={() => (confirmFactory = false)}>
            {$LL.dialogs.cancel()}
          </Button>
          <Button
            variant='destructive'
            disabled={command.busy}
            aria-describedby='factory-reset-help'
            onclick={() => send({ type: 'factory.reset' })}
          >
            {$LL.settings.resetMetroMark()}
          </Button>
        {:else}
          <Button
            id='factory-reset'
            disabled={command.busy}
            onclick={() => (confirmFactory = true)}
          >
            {$LL.settings.factoryReset()}
          </Button>
        {/if}
      </SettingsCard>
    </Tabs.Content>
  </div>
</Tabs.Root>

<DialogError error={command.error} />

{#if isPreview}
  <div class='shrink-0 rounded-sm border-t-border bg-background p-4'>
    <span class='text-[0.5rem] tracking-widest text-(--muted-foreground)'>{$LL.settings.demoWorkspace()}</span>
    <p class='mt-2.25 mb-3.25 text-[10px] leading-relaxed text-(--muted-foreground)'>
      {$LL.settings.demoWorkspaceText()}
    </p>
    {#if confirmPreview}
      <Button disabled={command.busy} onclick={resetPreview}>
        {$LL.settings.confirmDemoReset()}
      </Button>
    {:else}
      <button
        class='bg-transparent p-0 text-[10px] text-(--primary)'
        onclick={() => (confirmPreview = true)}
      >
        {$LL.settings.restoreSample()}
      </button>
    {/if}
  </div>
{/if}

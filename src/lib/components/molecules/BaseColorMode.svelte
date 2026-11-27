<script lang='ts'>
  import LL from '$i18n/i18n-svelte'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import SettingsRow from './SettingsRow.svelte'

  interface Props {
    auto: boolean
    color?: string
    busy: boolean
    idPrefix: string
    onchange: (auto: boolean, color?: string) => void
  }

  const DEFAULT_CUSTOM_COLOR = '#000000'

  const { auto, color, busy, idPrefix, onchange }: Props = $props()

  function selectMode(mode: string) {
    if (mode === 'auto') {
      onchange(true, color)
      return
    }
    if (mode === 'custom')
      onchange(false, color || DEFAULT_CUSTOM_COLOR)
  }
</script>

<SettingsRow
  title={$LL.settings.backgroundColor()}
  helpText={$LL.settings.backgroundColorHelp()}
  controlId={`${idPrefix}-source`}
  disabled={busy}
>
  <ToggleGroup.Root
    type='single'
    id={`${idPrefix}-source`}
    aria-labelledby={`${idPrefix}-source-title`}
    aria-describedby={`${idPrefix}-source-help`}
    value={auto ? 'auto' : 'custom'}
    disabled={busy}
    onValueChange={(mode) => {
      if (!mode)
        return
      selectMode(mode)
    }}
  >
    <ToggleGroup.Item value='auto' class='grow'>{$LL.settings.auto()}</ToggleGroup.Item>
    <ToggleGroup.Item value='custom' class='grow'>{$LL.settings.custom()}</ToggleGroup.Item>
  </ToggleGroup.Root>
</SettingsRow>
{#if !auto}
  <SettingsRow
    label={$LL.settings.customColor()}
    helpText={$LL.settings.customColorHelp()}
    controlId={`${idPrefix}-color`}
    disabled={busy}
  >
    <input
      id={`${idPrefix}-color`}
      type='color'
      disabled={busy}
      value={color || DEFAULT_CUSTOM_COLOR}
      aria-describedby={`${idPrefix}-color-help`}
      class='
        size-8 cursor-pointer rounded-xs border border-(--border) bg-transparent p-0.5
        disabled:cursor-not-allowed disabled:opacity-50
      '
      oninput={event => onchange(false, event.currentTarget.value)}
    />
    <p class='m-0 text-xs text-(--muted-foreground) uppercase'>
      {color || DEFAULT_CUSTOM_COLOR}
    </p>
  </SettingsRow>
{/if}

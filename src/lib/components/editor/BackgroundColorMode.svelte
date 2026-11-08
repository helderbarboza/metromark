<script lang='ts'>
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
  title='Background color'
  helpText='Choose an automatic or custom background color.'
  disabled={busy}
>
  <ToggleGroup.Root
    type='single'
    id={`${idPrefix}-source`}
    value={auto ? 'auto' : 'custom'}
    disabled={busy}
    onValueChange={(mode) => {
      if (!mode)
        return
      selectMode(mode)
    }}
  >
    <ToggleGroup.Item value='auto' class='grow'>Auto</ToggleGroup.Item>
    <ToggleGroup.Item value='custom' class='grow'>Custom</ToggleGroup.Item>
  </ToggleGroup.Root>
</SettingsRow>
{#if !auto}
  <SettingsRow
    title='Custom color'
    helpText='Choose the color used as the background.'
    controlId={`${idPrefix}-color`}
    disabled={busy}
  >
    <input
      id={`${idPrefix}-color`}
      type='color'
      disabled={busy}
      value={color || DEFAULT_CUSTOM_COLOR}
      class='
        size-8 cursor-pointer rounded-[3px] border border-(--border) bg-transparent p-0.5
        disabled:cursor-not-allowed disabled:opacity-50
      '
      oninput={event => onchange(false, event.currentTarget.value)}
    />
    <p class='m-0 text-xs text-(--muted-foreground) uppercase'>
      {color || DEFAULT_CUSTOM_COLOR}
    </p>
  </SettingsRow>
{/if}

<script lang='ts'>
  import { Label, RadioGroup } from 'bits-ui'

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

<RadioGroup.Root
  class='flex gap-4 text-sm'
  value={auto ? 'auto' : 'custom'}
  onValueChange={selectMode}
  disabled={busy}
  aria-label='Background color source'
>
  <div class='flex items-center'>
    <RadioGroup.Item
      id={`${idPrefix}-auto`}
      value='auto'
      class='
        size-5 shrink-0 cursor-pointer rounded-full border border-(--border) bg-(--card)
        transition-all duration-100 ease-in-out
        hover:border-(--muted-foreground)
        disabled:cursor-not-allowed disabled:opacity-50
        data-[state=checked]:border-[6px] data-[state=checked]:border-(--primary)
      '
    />
    <Label.Root for={`${idPrefix}-auto`} class='pl-3'>Auto</Label.Root>
  </div>
  <div class='flex items-center'>
    <RadioGroup.Item
      id={`${idPrefix}-custom`}
      value='custom'
      class='
        size-5 shrink-0 cursor-pointer rounded-full border border-(--border) bg-(--card)
        transition-all duration-100 ease-in-out
        hover:border-(--muted-foreground)
        disabled:cursor-not-allowed disabled:opacity-50
        data-[state=checked]:border-[6px] data-[state=checked]:border-(--primary)
      '
    />
    <Label.Root for={`${idPrefix}-custom`} class='pl-3'>Custom</Label.Root>
  </div>
</RadioGroup.Root>
{#if auto}
  <p class='mt-3.5 text-xs text-(--muted-foreground)'>
    Uses your theme background.
  </p>
{:else}
  <div class='mt-3.5 flex items-center gap-2.5'>
    <input
      type='color'
      aria-label='Custom background color'
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
  </div>
{/if}

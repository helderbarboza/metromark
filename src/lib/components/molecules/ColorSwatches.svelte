<script lang='ts'>
  import LL from '$i18n/i18n-svelte'
  import Icon from '$lib/components/atoms/Icon.svelte'

  let {
    colors,
    colorIndex = $bindable(0),
    customColor = $bindable(''),
    onpick,
  }: {
    colors: string[]
    colorIndex?: number
    customColor?: string
    onpick?: () => void
  } = $props()

  const uid = $props.id()
</script>

<div class='mb-5.25 flex flex-col gap-2.25'>
  <span class='text-xs font-medium text-(--foreground)' id={uid}>
    {$LL.colors.title()}
  </span>
  <div
    class='flex flex-wrap gap-1.75'
    role='group'
    aria-labelledby={uid}
  >
    {#each colors as swatch, i (i)}
      <button
        type='button'
        style:background={swatch}
        aria-label={$LL.colors.swatch({ index: i + 1 })}
        aria-pressed={!customColor && colorIndex === i}
        class='
          flex size-7.75 items-center justify-center rounded-xs text-white
          aria-pressed:outline-2 aria-pressed:outline-offset-2
          aria-pressed:outline-(--foreground)
        '
        onclick={() => {
          customColor = ''
          colorIndex = i
          onpick?.()
        }}
      >
        {#if !customColor && colorIndex === i}
          <Icon name='check' size={16} />
        {/if}
      </button>
    {/each}
    <button
      type='button'
      style:background={customColor || 'var(--card)'}
      aria-label={$LL.colors.customColor()}
      aria-pressed={!!customColor}
      class='
        flex size-7.75 items-center justify-center rounded-xs text-white
        aria-pressed:outline-2 aria-pressed:outline-offset-2
        aria-pressed:outline-(--foreground)
      '
      onclick={() => {
        if (!customColor) {
          customColor = '#000000'
          colorIndex = -1
          onpick?.()
        }
      }}
    >
      {#if customColor}
        <Icon name='check' size={16} />
      {:else}
        <Icon name='add' size={16} />
      {/if}
    </button>
    {#if customColor}
      <input
        type='color'
        bind:value={customColor}
        aria-label={$LL.colors.customTileColor()}
        title={$LL.colors.customColor()}
        class='
          size-8 cursor-pointer rounded-xs border border-(--border) bg-transparent p-0.5
        '
      />
    {/if}
  </div>
</div>

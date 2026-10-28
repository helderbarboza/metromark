<script lang='ts'>
  import Icon from '$lib/components/Icon.svelte'

  let {
    colors,
    colorIndex = $bindable(0),
    customColor = $bindable(''),
  }: {
    colors: string[]
    colorIndex?: number
    customColor?: string
  } = $props()

  const uid = $props.id()
</script>

<div class='mb-5.25 flex flex-col gap-2.25'>
  <span class='text-[12px] font-medium text-(--text)' id={uid}>
    Color
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
        aria-label='Use theme color {i + 1}'
        aria-pressed={!customColor && colorIndex === i}
        class='
          flex size-7.75 items-center justify-center rounded-[3px] text-white
          aria-pressed:outline-2 aria-pressed:outline-offset-2
          aria-pressed:outline-(--text)
        '
        onclick={() => {
          customColor = ''
          colorIndex = i
        }}
      >
        {#if !customColor && colorIndex === i}
          <Icon name='check' size={16} />
        {/if}
      </button>
    {/each}
    <button
      type='button'
      style:background={customColor || 'var(--surface)'}
      aria-label='Custom color'
      aria-pressed={!!customColor}
      class='
        flex size-7.75 items-center justify-center rounded-[3px] text-white
        aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-(--text)
      '
      onclick={() => {
        if (!customColor) {
          customColor = '#000000'
          colorIndex = -1
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
        aria-label='Custom tile color'
        title='Custom color'
        class='
          size-8 cursor-pointer rounded-[3px] border border-(--line) bg-transparent p-0.5
        '
      />
    {/if}
  </div>
</div>

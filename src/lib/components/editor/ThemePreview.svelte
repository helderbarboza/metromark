<script lang='ts'>
  interface Props {
    theme: string
    mode: 'light' | 'dark'
  }

  const { theme, mode }: Props = $props()

  const boards = [
    {
      label: 'Daily',
      tiles: [
        'col-span-2 row-span-2 bg-(--base08)',
        'col-span-2 bg-(--base09)',
        'bg-(--base0A)',
        'col-span-2 bg-(--base0B)',
        'bg-(--base0C)',
        'col-span-2 row-span-2 bg-(--base0D)',
        'bg-(--base0E)',
        'bg-(--base0F)',
        'bg-(--base08)',
        'bg-(--base09)',
        'bg-(--base0A)',
        'bg-(--base0B)',
        'col-span-2 bg-(--base0C)',
        'col-span-2 bg-(--base0D)',
        'bg-(--base0E)',
        'bg-(--base0F)',
        'bg-(--base08)',
        'bg-(--base09)',
      ],
    },
    {
      label: 'Work',
      tiles: [
        'col-span-2 row-span-2 bg-(--base08)',
        'col-span-2 bg-(--base09)',
        'bg-(--base0A)',
        'col-span-2 bg-(--base0B)',
        'bg-(--base0C)',
        'bg-(--base0D)',
        'col-span-2 bg-(--base0E)',
        'bg-(--base0F)',
        'bg-(--base08)',
        'bg-(--base09)',
      ],
    },
    {
      label: 'Projects',
      tiles: [
        'col-span-2 bg-(--base0C)',
        'bg-(--base0D)',
        'bg-(--base0E)',
        'col-span-2 bg-(--base0F)',
        'bg-(--base08)',
        'col-span-2 bg-(--base09)',
        'col-span-2 row-span-2 bg-(--base0A)',
        'bg-(--base0B)',
        'bg-(--base0C)',
        'bg-(--base0D)',
        'bg-(--base0E)',
        'bg-(--base0F)',
        'bg-(--base08)',
        'bg-(--base09)',
        'bg-(--base0A)',
        'bg-(--base0B)',
      ],
    },
  ]
</script>

<span
  data-theme={theme}
  aria-hidden='true'
  class='theme-preview flex flex-row gap-2 bg-(--background) px-2 py-3'
  class:dark={mode === 'dark'}
>
  {#each boards as board (board.label)}
    <span class='flex w-full flex-col'>
      <span class='pb-0.5 text-[0.5rem] leading-none text-(--foreground)'>{board.label}</span>
      <span
        class='
          grid min-h-6 auto-cols-2 grid-flow-col grid-rows-[repeat(4,0.5rem)] gap-px
        '
      >
        {#each board.tiles as tile, i (i)}
          <span class={tile}></span>
        {/each}
      </span>
    </span>
  {/each}
</span>

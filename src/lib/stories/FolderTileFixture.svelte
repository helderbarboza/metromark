<script module lang='ts'>
  import type { PreviewCell } from '$lib/types'

  const seed: PreviewCell[] = [
    {
      id: 'a',
      kind: 'bookmark',
      title: 'MDN',
      url: 'https://developer.mozilla.org/',
      colorIndex: 5,
    },
    {
      id: 'b',
      kind: 'bookmark',
      title: 'Svelte',
      url: 'https://svelte.dev/',
      colorIndex: 6,
    },
    {
      id: 'c',
      kind: 'bookmark',
      title: 'TypeScript',
      url: 'https://www.typescriptlang.org/',
      colorIndex: 2,
    },
  ]
</script>

<script lang='ts'>
  import type { TileSize } from '$lib/types'
  import FolderTile from '$lib/components/organisms/FolderTile.svelte'
  import { cellsToPx, SIZES } from '$lib/layout'
  import WorkspaceProvider from './WorkspaceProvider.svelte'

  interface Props {
    reducedMotion?: boolean
  }

  const { reducedMotion = false }: Props = $props()

  let size = $state<TileSize>('medium')
  let preview = $state<PreviewCell[]>([...seed])

  const tile = $derived({
    id: 'harness',
    kind: 'folder' as const,
    title: 'Harness folder',
    colorIndex: 5,
    writable: true,
    size,
    preview,
  })

  function addChild(): void {
    const n = preview.length
    const child: PreviewCell = {
      id: `extra-${n}`,
      kind: 'bookmark',
      title: `Extra ${n}`,
      url: 'https://example.com/',
      colorIndex: 0,
    }
    preview = [...preview, child]
  }

  function removeChild(): void {
    preview = preview.slice(0, -1)
  }
</script>

<div class='flex flex-col items-start gap-2'>
  <div class='flex gap-2'>
    <button type='button' data-testid='size-small' onclick={() => size = 'small'}>Small</button>
    <button type='button' data-testid='size-medium' onclick={() => size = 'medium'}>Medium</button>
    <button type='button' data-testid='size-large' onclick={() => size = 'large'}>Large</button>
    <button type='button' data-testid='add-child' onclick={addChild}>Add child</button>
    <button type='button' data-testid='remove-child' onclick={removeChild}>Remove child</button>
  </div>
  <WorkspaceProvider state={{ reducedMotion }}>
    <FolderTile
      {tile}
      {size}
      ariaLabel='Folder Harness folder'
      style={`display:block;
        width:${cellsToPx(SIZES[size][0], 68)}px;
        height:${cellsToPx(SIZES[size][1], 68)}px`}
    />
  </WorkspaceProvider>
</div>

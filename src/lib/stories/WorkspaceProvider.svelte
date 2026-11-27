<script lang='ts'>
  import type { WorkspaceState } from '$lib/workspace-context'
  import type { Snippet } from 'svelte'
  import { SETTINGS_DEFAULTS } from '$lib/config'
  import { TILE_SIZES } from '$lib/layout'
  import { setWorkspace } from '$lib/workspace-context'

  interface Props {
    /** Overrides for the workspace state; omitted fields default to inert. */
    state?: Partial<WorkspaceState>
    children?: Snippet
  }

  const { state = {}, children }: Props = $props()

  setWorkspace(() => ({
    dragging: state.dragging ?? false,
    selectedId: state.selectedId ?? null,
    reducedMotion: state.reducedMotion ?? SETTINGS_DEFAULTS.reducedMotion,
    originalFavicons: state.originalFavicons ?? SETTINGS_DEFAULTS.originalFavicons,
    cutoutTiles: state.cutoutTiles ?? SETTINGS_DEFAULTS.cutoutTiles ?? false,
    sizes: state.sizes ?? TILE_SIZES,
  }))
</script>

{@render children?.()}

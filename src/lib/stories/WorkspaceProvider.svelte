<script lang='ts'>
  import type { WorkspaceState } from '$lib/workspace-context'
  import type { Snippet } from 'svelte'
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
    reducedMotion: state.reducedMotion ?? false,
    originalFavicons: state.originalFavicons ?? false,
    largeAvailable: state.largeAvailable ?? true,
  }))
</script>

{@render children?.()}

import type { Command, Layout } from '$lib/types'

/**
 * Batches within-folder drag layouts into one cross-group `layout.commit`
 * command. Source and destination callbacks belong to one gesture, so they
 * are collapsed by a short timer. Source removal during a drag is not a
 * deletion.
 */
export class LayoutStager {
  draftLayouts = $state.raw<Record<string, Layout>>({})
  #timer: ReturnType<typeof setTimeout> | undefined
  #execute: (command: Command) => Promise<boolean>

  constructor(execute: (command: Command) => Promise<boolean>) {
    this.#execute = execute
  }

  stage = (id: string, layout: Layout) => {
    this.draftLayouts = { ...this.draftLayouts, [id]: layout }
    clearTimeout(this.#timer)
    // Source and destination callbacks belong to one gesture. Never treat
    // source removal as deletion.
    this.#timer = setTimeout(() => {
      const committed = structuredClone(this.draftLayouts)
      void this.#execute({ type: 'layout.commit', layouts: committed }).finally(
        () => {
          this.draftLayouts = {}
        },
      )
    }, 35)
  }

  /** Drop pending drafts and cancel the flush (factory reset, unmount). */
  reset = () => {
    clearTimeout(this.#timer)
    this.draftLayouts = {}
  }
}

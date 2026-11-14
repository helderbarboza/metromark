import type { DialogSpec } from '$lib/components/editor/dialog-spec'
import type { UndoSummary } from '$lib/types'

export interface KeyboardNavDeps {
  isMenuOpen: () => boolean
  getDialog: () => DialogSpec | null
  closeDialog: () => void
  getQuery: () => string
  clearQuery: () => void
  getUndos: () => UndoSummary[]
  getNow: () => number
  isDragging: () => boolean
  onUndo: (id: string) => void
  clearSelection: () => void
  focusSearch: () => void
}

/**
 * Canvas-level keyboard shortcuts for the new tab page.
 *
 * Owns the `kbMenu` flag: Shift+F10 and the Menu key produce a contextmenu
 * whose coordinates still point at the last mouse position, so selectTile
 * and handleContextMenu need to know the event was keyboard-driven.
 */
export class KeyboardNav {
  /** True when the next contextmenu event was keyboard-driven. Not reactive. */
  kbMenu = false

  #deps: KeyboardNavDeps

  constructor(deps: KeyboardNavDeps) {
    this.#deps = deps
  }

  handleKey = (event: KeyboardEvent) => {
    // Another layer (e.g. a menus's Escape/keyboard handling) already handled this key.
    if (event.defaultPrevented)
      return
    const input
      = event.target instanceof Element
        && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)
    // The browser fires contextmenu for these keys; mark it as keyboard-driven.
    if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu')
      this.kbMenu = true
    // Menus are self-contained while open (Escape/Tab/arrows); leave them alone.
    const inMenu
      = document.activeElement instanceof Element
        && document.activeElement.closest('[role="menu"]') !== null
    if (this.#deps.isMenuOpen() || inMenu)
      return
    const dialog = this.#deps.getDialog()
    if (dialog) {
      // Settings is a non-modal drawer, so Escape is its keyboard close action.
      if (dialog.kind === 'settings' && event.key === 'Escape') {
        event.preventDefault()
        this.#deps.closeDialog()
      }
      return
    }
    if (
      !input
      && (event.key === '/'
        || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'))
    ) {
      event.preventDefault()
      this.#deps.focusSearch()
    }
    if (
      !input
      && (event.metaKey || event.ctrlKey)
      && event.key.toLowerCase() === 'z'
    ) {
      const recent = this.#deps.getUndos()
        .filter(entry => entry.expiresAt > this.#deps.getNow())
        .at(-1)
      if (recent) {
        event.preventDefault()
        this.#deps.onUndo(recent.id)
      }
    }
    if (event.key === 'Escape' && !this.#deps.isDragging()) {
      if (this.#deps.getQuery())
        this.#deps.clearQuery()
      // Selection itself is cleared here; the app bar returns focus to its tile.
      this.#deps.clearSelection()
    }
  }
}

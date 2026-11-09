/**
 * bits-ui focuses the menu content element when a menu opens via contextmenu,
 * which skips the first item. Menus in this app open with the first command
 * focused, so this helper is used as the Content `onOpenAutoFocus` handler.
 */
export function focusFirstMenuItem(
  event: Event,
  container: HTMLElement | null | undefined,
): void {
  const item = container?.querySelector<HTMLElement>(
    '[role="menuitem"]:not([aria-disabled="true"])',
  )
  if (!item)
    return
  event.preventDefault()
  item.focus({ preventScroll: true })
}

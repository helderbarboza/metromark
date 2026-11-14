/**
 * Metro "tilt": the tile leans away from where you press it. Purely decorative
 * press feedback; CSS drops it under reduced motion. Attached
 * imperatively so the visual wrapper needs no interactive ARIA role.
 */
export function tilt(node: HTMLElement) {
  const lean = (event: PointerEvent) => {
    const rect = node.getBoundingClientRect()
    if (!rect.width || !rect.height)
      return
    node.style.setProperty(
      '--tilt-x',
      `${(-((event.clientY - rect.top) / rect.height - 0.5) * 14).toFixed(1)}deg`,
    )
    node.style.setProperty(
      '--tilt-y',
      `${(((event.clientX - rect.left) / rect.width - 0.5) * 14).toFixed(1)}deg`,
    )
  }
  const settle = () => {
    node.style.setProperty('--tilt-x', '0deg')
    node.style.setProperty('--tilt-y', '0deg')
  }
  node.addEventListener('pointerdown', lean)
  node.addEventListener('pointerup', settle)
  node.addEventListener('pointercancel', settle)
  node.addEventListener('pointerleave', settle)
  return () => {
    node.removeEventListener('pointerdown', lean)
    node.removeEventListener('pointerup', settle)
    node.removeEventListener('pointercancel', settle)
    node.removeEventListener('pointerleave', settle)
  }
}

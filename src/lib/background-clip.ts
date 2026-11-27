/**
 * Builds a CSS clip path that limits a layer to tile background regions. The live
 * background layer stays visible and CSS hides everything outside the tiles,
 * so no background pixels need to be sampled into a canvas.
 */
export function buildBackgroundClipPath(
  tiles: Iterable<HTMLElement>,
  origin: DOMRect,
): string {
  let path = ''
  for (const tile of tiles) {
    const box = tile.getBoundingClientRect()
    const w = box.width
    const h = box.height
    if (w <= 0 || h <= 0)
      continue
    const x = box.left - origin.left
    const y = box.top - origin.top
    const x2 = x + w
    const y2 = y + h
    path += `M${x.toFixed(1)} ${y.toFixed(1)}H${x2.toFixed(1)}V${y2.toFixed(1)}H${x.toFixed(1)}Z`
  }
  return path
    ? `path('${path}')`
    : 'inset(100%)'
}

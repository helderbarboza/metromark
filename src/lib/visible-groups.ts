import type { GridView } from '$lib/layout'
import type { GroupView, Snapshot } from '$lib/types'
import { reconcileLayout, rowsForGridView } from '$lib/layout'

/**
 * Filters groups by the selected browser-container root and the search query.
 * A tile matches when the group's path, the tile title, or (for bookmarks) the
 * URL contains the query. Groups whose matching tiles reconcile to an empty
 * layout are hidden.
 */
export function filterVisibleGroups(
  groups: GroupView[],
  rootFilter: string,
  normalizedQuery: string,
  appearance: Snapshot['appearance'] | undefined,
  gridView?: GridView,
): GroupView[] {
  const rows = rowsForGridView(gridView)
  const filtered = groups.filter(
    group => rootFilter === 'all' || group.rootId === rootFilter,
  )
  if (!normalizedQuery || !appearance)
    return filtered
  return filtered
    .map((group) => {
      const matchesPath = group.path
        .join(' / ')
        .toLowerCase()
        .includes(normalizedQuery)
      const matching = Object.values(group.tiles).filter((tile) => {
        const matchesTile = `${tile.title} ${tile.kind === 'bookmark'
          ? tile.url
          : ''}`
          .toLowerCase()
          .includes(normalizedQuery)
        return matchesPath || matchesTile
      })
      const sizes = Object.fromEntries(
        matching.map(tile => [
          tile.id,
          { ...appearance[tile.id], size: tile.size },
        ]),
      )
      return {
        ...group,
        layout: reconcileLayout(
          matching.map(tile => ({
            id: tile.id,
            title: tile.title,
            url: tile.kind === 'bookmark'
              ? tile.url
              : undefined,
          })),
          [],
          sizes,
          rows,
        ),
      }
    })
    .filter(group => group.layout.length)
}

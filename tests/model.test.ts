import type { Snapshot } from '$lib/types'
import { normalizeTree } from '$lib/adapters/memory'
import { demoData, demoTree } from '$lib/demo'
import { buildExtensionFaviconUrl, clampFaviconSize, faviconRequestForTile, isFaviconEligible } from '$lib/icon-sources'
import { DOCK_ROWS, effectiveTileSize, overlaps, reconcileLayout, ROWS, usedCols, validateLayout } from '$lib/layout'
import { canAddTo, canModify, flatten, indexTree, isBookmark, projectGroups } from '$lib/tree'
import { hashColorIndex } from '$lib/tree-utils'
import { validateUrl } from '$lib/url'
import { describe, expect, it } from 'vitest'

function fixture(): Snapshot {
  return {
    ...demoData(),
    tree: normalizeTree(demoTree()),
    revision: 0,
    mode: 'preview',
    undos: [],
  }
}

describe('bookmark tree projection', () => {
  it('keeps separate browser roots and flattens folders with full paths', () => {
    const groups = projectGroups(fixture())
    expect(groups.map(group => group.id)).toEqual([
      'bar',
      'work',
      'inspiration',
      'learning',
      'tools',
      'other',
      'mobile',
    ])
    expect(groups.find(group => group.id === 'tools')?.path).toEqual(['Bookmarks bar', 'Learning', 'Tools'])
    expect(groups.find(group => group.id === 'bar')?.layout).toHaveLength(8)
  })
  it('retains empty folders', () => {
    expect(projectGroups(fixture()).find(group => group.id === 'mobile')?.layout).toEqual([])
  })
  it('protects containers, not their normal bookmark children', () => {
    const tree = fixture().tree
    const nodes = indexTree(tree)
    expect(canModify(nodes.get('bar')!, tree)).toBe(false)
    expect(canAddTo(nodes.get('bar')!, tree)).toBe(true)
    expect(canModify(nodes.get('steam')!, tree)).toBe(true)
    expect(canAddTo(nodes.get('root')!, tree)).toBe(false)
  })
  it('inherits managed read-only restrictions', () => {
    const state = fixture()
    indexTree(state.tree).get('work')!.unmodifiable = 'managed'
    expect(canModify(indexTree(state.tree).get('slack')!, state.tree)).toBe(false)
    expect(canAddTo(indexTree(state.tree).get('work')!, state.tree)).toBe(false)
  })
  it('distinguishes duplicate titles and URLs using bookmark IDs', () => {
    const state = fixture()
    const bar = indexTree(state.tree).get('bar')!
    bar.children!.push({
      id: 'duplicate',
      parentId: 'bar',
      title: 'Steam',
      url: 'https://store.steampowered.com/',
    })
    expect(projectGroups(state)[0].layout).toHaveLength(9)
    expect(Object.keys(projectGroups(state)[0].tiles)).toContain('duplicate')
  })
  it('does not render Firefox separators as bookmarks or groups', () => {
    const state = fixture()
    indexTree(state.tree).get('bar')!.children!.push({
      id: 'separator',
      title: '',
      type: 'separator',
      parentId: 'bar',
    })
    expect(projectGroups(state)[0].layout).toHaveLength(8)
  })
  it('updates every descendant path on an ancestor rename', () => {
    const state = fixture()
    indexTree(state.tree).get('learning')!.title = 'Reference'
    expect(projectGroups(state).find(group => group.id === 'tools')?.path).toEqual(['Bookmarks bar', 'Reference', 'Tools'])
  })
})

describe('independent layouts', () => {
  it('preserves coordinates across native sibling reorders', () => {
    const state = fixture()
    const bar = indexTree(state.tree).get('bar')!
    const before = projectGroups(state)[0].layout
    bar.children!.reverse()
    // Bookmarks keep their saved positions regardless of sibling order; folder
    // tiles that were never saved may pack afresh around them.
    const bookmarkIds = new Set([
      'steam',
      'linear',
      'github',
      'notion',
      'gmail',
    ])
    expect(projectGroups(state)[0].layout.filter(entry => bookmarkIds.has(entry.i)))
      .toEqual(before.filter(entry => bookmarkIds.has(entry.i)))
  })
  it('packs a newly added bookmark without overwriting saved positions', () => {
    const state = fixture()
    const bar = indexTree(state.tree).get('bar')!
    const old = projectGroups(state)[0].layout
    bar.children!.push({
      id: 'fresh',
      title: 'Fresh',
      url: 'https://example.com',
      parentId: 'bar',
    })
    const next = projectGroups(state)[0].layout
    for (const position of old) expect(next.find(entry => entry.i === position.i)).toEqual(position)
    const newPosition = next.find(entry => entry.i === 'fresh')!
    expect(old.some(position => overlaps(position, newPosition))).toBe(false)
  })
  it('grows past 48 columns without exceeding the Metro row budget', () => {
    const links = Array.from({ length: 180 }, (_, i) => ({ id: `${i}`, title: `${i}`, url: 'https://example.com' }))
    const layout = reconcileLayout(links)
    expect(usedCols(layout)).toBeGreaterThan(48)
    expect(layout.every(entry => entry.y >= 0 && entry.y + entry.h <= 8)).toBe(true)
    expect(new Set(layout.map(entry => entry.i)).size).toBe(180)
  })
  it('repairs collisions and clamps a large tile to valid rows', () => {
    const links = [
      { id: 'a', title: 'a', url: 'https://a.com' },
      { id: 'b', title: 'b', url: 'https://b.com' },
    ]
    const result = reconcileLayout(links, [
      { i: 'a', x: 0, y: 5, w: 4, h: 4 },
      { i: 'b', x: 0, y: 4, w: 2, h: 2 },
    ])
    expect(result[0].y + result[0].h).toBeLessThanOrEqual(8)
    expect(overlaps(result[0], result[1])).toBe(false)
  })
  it('rejects unknown sizes, negative coordinates, and repeated IDs', () => {
    expect(() => validateLayout([
      { i: 'a', x: -1, y: 0, w: 2, h: 2 },
    ])).toThrow()
    expect(() => validateLayout([
      { i: 'a', x: 0, y: 0, w: 3, h: 3 },
    ])).toThrow()
    expect(() => validateLayout([
      { i: 'a', x: 0, y: 0, w: 2, h: 2 },
      { i: 'a', x: 2, y: 0, w: 2, h: 2 },
    ])).toThrow()
  })
})

describe('dock grid view', () => {
  it('projects the same tree into two rows and remaps Large tiles to Wide', () => {
    const state = fixture()
    state.settings = { ...state.settings, gridView: 'dock' }
    const groups = projectGroups(state)
    const bar = groups.find(group => group.id === 'bar')!
    expect(bar.layout.length).toBeGreaterThan(0)
    expect(bar.layout.every(entry => entry.y >= 0 && entry.y + entry.h <= DOCK_ROWS)).toBe(true)
    expect(bar.tiles.steam?.size).toBe('wide')
    expect(bar.tiles.linear?.size).toBe('medium')
    expect(bar.layout.find(entry => entry.i === 'steam')).toMatchObject({ w: 4, h: 2 })
  })
  it('keeps the classic 8-row projection untouched in classic view', () => {
    const state = fixture()
    const bar = projectGroups(state).find(group => group.id === 'bar')!
    expect(bar.tiles.steam?.size).toBe('large')
    expect(bar.layout.find(entry => entry.i === 'steam')).toMatchObject({ h: 4 })
  })
  it('validates dock commits against 2 rows only', () => {
    expect(validateLayout([
      { i: 'a', x: 0, y: 1, w: 1, h: 1 },
    ], DOCK_ROWS)).toHaveLength(1)
    expect(() => validateLayout([
      { i: 'a', x: 0, y: 1, w: 2, h: 2 },
    ], DOCK_ROWS)).toThrow()
    expect(() => validateLayout([
      { i: 'a', x: 0, y: 0, w: 4, h: 4 },
    ], DOCK_ROWS)).toThrow()
    // The same 4x4 item is valid in the classic grid.
    expect(validateLayout([
      { i: 'a', x: 0, y: 4, w: 4, h: 4 },
    ], ROWS)).toHaveLength(1)
  })
  it('remaps a stored classic Large tile instead of overflowing the dock grid', () => {
    const links = [
      { id: 'a', title: 'a', url: 'https://a.com' },
    ]
    const result = reconcileLayout(links, [
      { i: 'a', x: 0, y: 5, w: 4, h: 4 },
    ], {
      a: { size: 'large' },
    }, DOCK_ROWS)
    expect(result[0].h).toBe(2)
    expect(result[0].y + result[0].h).toBeLessThanOrEqual(DOCK_ROWS)
  })
  it('resolves effective sizes without rewriting the stored appearance', () => {
    expect(effectiveTileSize('large', DOCK_ROWS)).toBe('wide')
    expect(effectiveTileSize('large', ROWS)).toBe('large')
    expect(effectiveTileSize('medium', DOCK_ROWS)).toBe('medium')
  })
})

describe('safe navigation', () => {
  it('accepts valid web and mail addresses', () => {
    expect(validateUrl(' https://example.com ')).toBe('https://example.com')
    expect(validateUrl('mailto:me@example.com')).toBe('mailto:me@example.com')
  })
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>',
    'vbscript:msgbox(1)',
    'blob:https://example.com/id',
    'example.com',
    '',
  ])('rejects %s', (url) => {
    expect(() => validateUrl(url)).toThrow()
  })
  it('keeps all sample URLs as actual distinct bookmark entities', () => {
    expect(flatten(fixture().tree).filter(isBookmark)).toHaveLength(24)
  })
})

describe('tile favicons', () => {
  const base = 'chrome-extension://test-id/_favicon/'
  it('builds a cache URL for http(s) pages', () => {
    const url = buildExtensionFaviconUrl('https://example.com/page', 64, base)!
    expect(url).toContain('/_favicon/')
    expect(url).toContain(`pageUrl=${encodeURIComponent('https://example.com/page')}`)
    expect(url).toContain('size=64')
  })
  it('clamps the requested size to the browser-supported range', () => {
    expect(buildExtensionFaviconUrl('https://example.com', 512, base)).toContain('size=64')
    expect(clampFaviconSize(512)).toBe(64)
    expect(clampFaviconSize(8)).toBe(16)
  })
  it('appends the density probe only at 2x', () => {
    expect(buildExtensionFaviconUrl('https://example.com', 64, base, 2)).toContain('scaleFactor=2x')
    expect(buildExtensionFaviconUrl('https://example.com', 64, base)).not.toContain('scaleFactor')
  })
  it('maps tile sizes to favicon requests', () => {
    expect(faviconRequestForTile('small')).toEqual({ requestSize: 64, scaleFactor: 2 })
    expect(faviconRequestForTile('medium')).toEqual({ requestSize: 64, scaleFactor: 2 })
    expect(faviconRequestForTile('wide')).toEqual({ requestSize: 64, scaleFactor: 2 })
    expect(faviconRequestForTile('large')).toEqual({ requestSize: 64, scaleFactor: 2 })
  })
  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'blob:https://example.com/id',
    'mailto:me@example.com',
    'ftp://example.com/f',
    'not a url',
    '',
  ])('returns null for %s', (url) => {
    expect(buildExtensionFaviconUrl(url, 64, base)).toBeNull()
  })
  it('returns null without an extension runtime base', () => {
    expect(buildExtensionFaviconUrl('https://example.com')).toBeNull()
  })
  it('detects favicon-eligible pages', () => {
    expect(isFaviconEligible('https://example.com')).toBe(true)
    expect(isFaviconEligible('http://example.com')).toBe(true)
    expect(isFaviconEligible('javascript:alert(1)')).toBe(false)
    expect(isFaviconEligible('')).toBe(false)
  })
})

describe('folder tiles', () => {
  const folderPreview = (groups: ReturnType<typeof projectGroups>, groupId: string, tileId: string) => {
    const tile = groups.find(group => group.id === groupId)?.tiles[tileId]
    if (tile?.kind !== 'folder')
      throw new TypeError(`Expected a folder tile '${tileId}' in group '${groupId}'`)
    return tile.preview
  }
  it('renders direct subfolders as tiles inside the parent group', () => {
    const groups = projectGroups(fixture())
    const bar = groups.find(group => group.id === 'bar')!
    expect(bar.tiles.work?.kind).toBe('folder')
    expect(bar.tiles.work?.title).toBe('Work')
    expect(bar.tiles.inspiration?.kind).toBe('folder')
    expect(bar.tiles.learning?.kind).toBe('folder')
    expect(bar.layout.find(entry => entry.i === 'work')).toBeDefined()
    // Folder tiles and bookmarks share one persisted layout.
    expect(bar.layout.map(entry => entry.i)).toEqual(expect.arrayContaining([
      'steam',
      'work',
      'inspiration',
      'learning',
    ]))
  })
  it('previews the folder’s children in layout order with a bookmark/folder split', () => {
    const groups = projectGroups(fixture())
    const preview = folderPreview(groups, 'bar', 'learning')
    expect(preview).toHaveLength(5)
    expect(preview.map(cell => cell.id)).toEqual(expect.arrayContaining([
      'mdn',
      'svelte',
      'typescript',
      'tailwind',
      'tools',
    ]))
    // Preview order is the folder's own layout order, not sibling order.
    const learning = groups.find(group => group.id === 'learning')!
    expect(preview.map(cell => cell.id)).toEqual(learning.layout.map(entry => entry.i))
    expect(preview.find(cell => cell.id === 'tools')?.kind).toBe('folder')
    expect(preview.find(cell => cell.id === 'mdn')?.kind).toBe('bookmark')
    // Bookmark preview cells carry a favicon source and their own tile colors.
    expect(preview.find(cell => cell.id === 'mdn')?.url).toBe('https://developer.mozilla.org/')
    expect(preview.find(cell => cell.id === 'mdn')?.colorIndex).toBeTypeOf('number')
  })
  it('caps the number of preview cells per tile size', () => {
    const state = fixture()
    state.appearance.learning = { ...state.appearance.learning, size: 'small' }
    const groups = projectGroups(state)
    const learning = groups.find(group => group.id === 'bar')?.tiles.learning
    expect(learning?.size).toBe('small')
    expect(folderPreview(groups, 'bar', 'learning')).toHaveLength(4)
  })
  it('renders managed folders as read-only folder tiles with a full preview', () => {
    const state = fixture()
    indexTree(state.tree).get('work')!.unmodifiable = 'managed'
    const groups = projectGroups(state)
    expect(groups.find(group => group.id === 'bar')?.tiles.work?.writable).toBe(false)
    expect(folderPreview(groups, 'bar', 'work')).toHaveLength(4)
  })
  it('shows an empty mosaic for an empty folder', () => {
    const state = fixture()
    indexTree(state.tree).get('bar')!.children!.push({
      id: 'quiet',
      parentId: 'bar',
      title: 'Quiet',
      children: [],
    })
    const groups = projectGroups(state)
    expect(groups.find(group => group.id === 'bar')?.tiles.quiet?.kind).toBe('folder')
    expect(folderPreview(groups, 'bar', 'quiet')).toEqual([])
  })
  it('derives a stable default color from the folder id and honors stored appearance', () => {
    const groups = projectGroups(fixture())
    const bar = groups.find(group => group.id === 'bar')!
    expect(bar.tiles.work?.colorIndex).toBe(hashColorIndex('work'))
    expect(bar.tiles.work?.color).toBeUndefined()
    const state = fixture()
    state.appearance.tools = { colorIndex: 2, color: '#a1b2c3' }
    const learning = projectGroups(state).find(group => group.id === 'learning')!
    expect(learning.tiles.tools).toMatchObject({ kind: 'folder', colorIndex: 2, color: '#a1b2c3' })
  })
  it('survives layout repairs without duplicating folder tiles', () => {
    const state = fixture()
    const groups = projectGroups(state)
    const tools = groups.find(group => group.id === 'tools')!
    expect(tools.layout.map(entry => entry.i)).toEqual(expect.arrayContaining(['storybook', 'snapgrid']))
    const flat = groups.flatMap(group => group.layout.map(entry => entry.i))
    expect(new Set(flat).size).toBe(flat.length)
  })
})

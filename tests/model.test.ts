import type { Appearance, Snapshot } from '../src/lib/types'
import { describe, expect, it } from 'vitest'
import { normalizeTree } from '../src/lib/adapters/memory'
import { demoData, demoTree } from '../src/lib/demo'
import { buildExtensionFaviconUrl, clampFaviconSize, faviconRequestForTile, isFaviconEligible } from '../src/lib/icon-sources'
import { globeIcon } from '../src/lib/icons'
import { overlaps, reconcileLayout, usedCols, validateLayout } from '../src/lib/layout'
import { tileFor } from '../src/lib/tile'
import { canAddTo, canModify, flatten, indexTree, isBookmark, projectGroups } from '../src/lib/tree'
import { validateUrl } from '../src/lib/url'

const fixture = (): Snapshot => ({ ...demoData(), tree: normalizeTree(demoTree()), revision: 0, mode: 'preview', undos: [] })

describe('bookmark tree projection', () => {
  it('keeps separate browser roots and flattens folders with full paths', () => {
    const groups = projectGroups(fixture())
    expect(groups.map(group => group.id)).toEqual(['bar', 'work', 'inspiration', 'learning', 'tools', 'other', 'mobile'])
    expect(groups.find(group => group.id === 'tools')?.path).toEqual(['Bookmarks bar', 'Learning', 'Tools'])
    expect(groups.find(group => group.id === 'bar')?.layout).toHaveLength(5)
  })
  it('retains empty folders', () => {
    expect(projectGroups(fixture()).find(group => group.id === 'mobile')?.layout).toEqual([])
  })
  it('protects containers, not their normal bookmark children', () => {
    const tree = fixture().tree
    const nodes = indexTree(tree)
    expect(canModify(nodes.get('bar')!, tree)).toBe(false)
    expect(canAddTo(nodes.get('bar')!, tree)).toBe(true)
    expect(canModify(nodes.get('figma')!, tree)).toBe(true)
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
    bar.children!.push({ id: 'duplicate', parentId: 'bar', title: 'Figma', url: 'https://www.figma.com/' })
    expect(projectGroups(state)[0].layout).toHaveLength(6)
    expect(Object.keys(projectGroups(state)[0].tiles)).toContain('duplicate')
  })
  it('does not render Firefox separators as bookmarks or groups', () => {
    const state = fixture()
    indexTree(state.tree).get('bar')!.children!.push({ id: 'separator', title: '', type: 'separator', parentId: 'bar' })
    expect(projectGroups(state)[0].layout).toHaveLength(5)
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
    expect(projectGroups(state)[0].layout).toEqual(before)
  })
  it('packs a newly added bookmark without overwriting saved positions', () => {
    const state = fixture()
    const bar = indexTree(state.tree).get('bar')!
    const old = projectGroups(state)[0].layout
    bar.children!.push({ id: 'fresh', title: 'Fresh', url: 'https://example.com', parentId: 'bar' })
    const next = projectGroups(state)[0].layout
    for (const position of old) expect(next.find(entry => entry.i === position.i)).toEqual(position)
    const newPosition = next.find(entry => entry.i === 'fresh')!
    expect(old.some(position => overlaps(position, newPosition))).toBe(false)
  })
  it('grows past 48 columns without exceeding the Metro row budget', () => {
    const links = Array.from({ length: 180 }, (_, i) => ({ id: `${i}`, title: `${i}`, url: 'https://example.com' }))
    const layout = reconcileLayout(links)
    expect(usedCols(layout)).toBeGreaterThan(48)
    expect(layout.every(entry => entry.y >= 0 && entry.y + entry.h <= 6)).toBe(true)
    expect(new Set(layout.map(entry => entry.i)).size).toBe(180)
  })
  it('repairs collisions and clamps a large tile to valid rows', () => {
    const links = [{ id: 'a', title: 'a', url: 'https://a.com' }, { id: 'b', title: 'b', url: 'https://b.com' }]
    const result = reconcileLayout(links, [{ i: 'a', x: 0, y: 5, w: 4, h: 4 }, { i: 'b', x: 0, y: 4, w: 2, h: 2 }])
    expect(result[0].y + result[0].h).toBeLessThanOrEqual(6)
    expect(overlaps(result[0], result[1])).toBe(false)
  })
  it('rejects unknown sizes, negative coordinates, and repeated IDs', () => {
    expect(() => validateLayout([{ i: 'a', x: -1, y: 0, w: 2, h: 2 }])).toThrow()
    expect(() => validateLayout([{ i: 'a', x: 0, y: 0, w: 3, h: 3 }])).toThrow()
    expect(() => validateLayout([{ i: 'a', x: 0, y: 0, w: 2, h: 2 }, { i: 'a', x: 2, y: 0, w: 2, h: 2 }])).toThrow()
  })
})

describe('safe navigation', () => {
  it('accepts valid web and mail addresses', () => {
    expect(validateUrl(' https://example.com ')).toBe('https://example.com')
    expect(validateUrl('mailto:me@example.com')).toBe('mailto:me@example.com')
  })
  it.each(['javascript:alert(1)', 'data:text/html,<script>', 'vbscript:msgbox(1)', 'blob:https://example.com/id', 'example.com', ''])('rejects %s', (url) => {
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
    expect(buildExtensionFaviconUrl('https://example.com', 64, base, 2)).toContain('scale_factor=2x')
    expect(buildExtensionFaviconUrl('https://example.com', 64, base)).not.toContain('scale_factor')
  })
  it('maps tile sizes to favicon requests', () => {
    expect(faviconRequestForTile('small')).toEqual({ requestSize: 32, scaleFactor: 1 })
    expect(faviconRequestForTile('medium')).toEqual({ requestSize: 64, scaleFactor: 2 })
    expect(faviconRequestForTile('wide')).toEqual({ requestSize: 64, scaleFactor: 2 })
    expect(faviconRequestForTile('large')).toEqual({ requestSize: 64, scaleFactor: 2 })
  })
  it.each(['javascript:alert(1)', 'data:text/html,x', 'blob:https://example.com/id', 'mailto:me@example.com', 'ftp://example.com/f', 'not a url', ''])('returns null for %s', (url) => {
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
  it('falls back to the generic globe icon when no favicon is available', () => {
    const tile = tileFor({ id: 'a', parentId: 'bar', title: 'Example', url: 'https://example.com' })
    expect(tile.icon).toBe(globeIcon)
    expect(tile.url).toBe('https://example.com')
  })
  it('ignores legacy appearance icon choices and still uses the favicon', () => {
    const tile = tileFor({ id: 'a', parentId: 'bar', title: 'Example', url: 'https://example.com' }, { icon: 'book' } as Appearance)
    expect(tile.icon).toBe(globeIcon)
  })
})

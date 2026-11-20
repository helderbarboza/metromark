import type { BookmarkNode, Snapshot } from '$lib/types'
import { BACKGROUND_DEFAULTS } from '$lib/config'
import { DEMO_PROFILES, isDemoProfileId } from '$lib/demo-profiles'
import { DEMO_PROFILE_SPECS } from '$lib/demo-spec'
import { overlaps, ROWS, SIZES } from '$lib/layout'
import { projectGroups } from '$lib/tree'
import { describe, expect, it } from 'vitest'

function flattenTree(nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.flatMap(node => [node, ...flattenTree(node.children ?? [])])
}

function snapshotOf(profile: (typeof DEMO_PROFILES)[keyof typeof DEMO_PROFILES]): Snapshot {
  return {
    ...profile.data(),
    tree: profile.tree(),
    revision: 0,
    mode: 'preview',
    undos: [],
  }
}

describe('demo profile specs', () => {
  it('have unique profile ids', () => {
    const ids = DEMO_PROFILE_SPECS.map(spec => spec.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('are accepted by isDemoProfileId', () => {
    for (const spec of DEMO_PROFILE_SPECS)
      expect(isDemoProfileId(spec.id)).toBe(true)
    expect(isDemoProfileId('bogus')).toBe(false)
    expect(isDemoProfileId(undefined)).toBe(false)
    expect(isDemoProfileId(42)).toBe(false)
  })

  it('have unique node ids within each profile', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      const ids = flattenTree(profile.tree()).map(node => node.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('use only https bookmark urls', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      for (const node of flattenTree(profile.tree())) {
        if (node.url !== undefined)
          expect(node.url).toMatch(/^https:\/\//)
      }
    }
  })

  it('give every node an appearance entry except the containers', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      const { appearance } = profile.data()
      for (const node of flattenTree(profile.tree())) {
        if (node.id === 'root' || node.id === 'bar' || node.id === 'other' || node.id === 'mobile')
          continue
        expect(appearance[node.id], `${profile.id} appearance for ${node.id}`).toBeDefined()
      }
    }
  })

  it('project to one group per folder with non-overlapping, in-bounds layouts', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      const snapshot = snapshotOf(profile)
      const tree = snapshot.tree
      const folderIds = flattenTree(tree)
        .filter(node => node.children !== undefined && node.id !== 'root')
        .map(node => node.id)
      const groups = projectGroups(snapshot)
      expect(groups.map(group => group.id).sort()).toEqual([...folderIds].sort())
      for (const group of groups) {
        for (const item of group.layout) {
          const size = snapshot.appearance[item.i]?.size
          expect(size, `${profile.id}/${group.id} appearance for ${item.i}`).toBeDefined()
          if (!size)
            continue
          expect([item.w, item.h]).toEqual(SIZES[size])
          expect(item.y + item.h).toBeLessThanOrEqual(ROWS)
        }
        for (let a = 0; a < group.layout.length; a++) {
          for (let b = a + 1; b < group.layout.length; b++) {
            const first = group.layout[a]
            const second = group.layout[b]
            expect(overlaps(first, second), `${profile.id}/${group.id} overlap ${first.i}/${second.i}`).toBe(false)
          }
        }
      }
    }
  })

  it('project every bookmark into its parent folder group', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      const snapshot = snapshotOf(profile)
      const groups = projectGroups(snapshot)
      for (const node of flattenTree(snapshot.tree)) {
        if (node.url === undefined)
          continue
        const parent = flattenTree(snapshot.tree).find(candidate => candidate.children?.includes(node))
        const group = groups.find(candidate => candidate.id === parent?.id)
        expect(group?.tiles[node.id], `${profile.id} tile for ${node.id}`).toBeDefined()
      }
    }
  })

  it('keep the three browser containers as separate named folders', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      const [root] = profile.tree()
      expect(root?.children?.map(node => node.folderType)).toEqual(['bookmarks-bar', 'other', 'mobile'])
    }
  })

  it('return fresh tree and data objects per call', () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      expect(profile.tree()).not.toBe(profile.tree())
      expect(profile.data()).not.toBe(profile.data())
      expect(profile.data().appearance).not.toBe(profile.data().appearance)
    }
  })
})

describe('demo profile backgrounds', () => {
  it('seed a complete background matching the spec per profile', () => {
    for (const spec of DEMO_PROFILE_SPECS) {
      const profile = DEMO_PROFILES[spec.id]
      const { background } = profile.data().settings
      expect(background.type, spec.id).toBe(spec.background.type)
      expect({ ...BACKGROUND_DEFAULTS[background.type], ...spec.background }).toEqual(background)
    }
  })

  it('use background types the app supports', () => {
    for (const spec of DEMO_PROFILE_SPECS)
      expect(Object.keys(BACKGROUND_DEFAULTS)).toContain(spec.background.type)
  })
})

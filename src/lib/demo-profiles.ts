// Seeded demo profiles for the web preview (?profile=<id>).
// Each profile is declared once in $lib/demo-spec (plain data, no value imports);
// this module derives the bookmark tree, the appearance map and the settings
// from it. Tile placement is left to the app's first-fit packing. Thematics
// stay out: themes and shaders are referenced by id.
import type { DemoNodeSpec, DemoProfileSpec } from '$lib/demo-spec'
import type { AppData, Appearance, BookmarkNode } from '$lib/types'
import { BACKGROUND_DEFAULTS, SETTINGS_DEFAULTS } from '$lib/config'
import { emptyData } from '$lib/coordinator'
import { DEMO_PROFILE_SPECS } from '$lib/demo-spec'

export type DemoProfileId = (typeof DEMO_PROFILE_SPECS)[number]['id']

export interface DemoProfile {
  id: DemoProfileId
  /** Shown in tooling and used as the screenshot file name. */
  label: string
  mode: 'light' | 'dark'
  theme: DemoProfileSpec['theme']
  tree: () => BookmarkNode[]
  data: () => AppData
}

function link(id: string, title: string, url: string): BookmarkNode {
  return { id, title, url }
}

function folder(id: string, title: string, children: BookmarkNode[], folderType?: string): BookmarkNode {
  return { id, title, children, folderType }
}

/**
 * Derive the bookmark tree and the appearance map in one pass. Spec nodes
 * carry no ids, so the pass assigns every node a generated id (n0, n1,
 * ...). Generated ids are unique and deterministic, so tree() and data()
 * always agree on them. The scaffold containers keep the fixed ids
 * root, bar, other and mobile.
 */
function demoTreeFor(spec: DemoProfileSpec): { tree: BookmarkNode[], appearance: Record<string, Appearance> } {
  let nextId = 0
  const appearance: Record<string, Appearance> = {}
  const nodeToNode = (node: DemoNodeSpec): BookmarkNode => {
    const id = `n${nextId++}`
    appearance[id] = { size: node.size, colorIndex: node.colorIndex }
    if ('children' in node)
      return folder(id, node.title, node.children.map(nodeToNode))
    return link(id, node.title, node.url)
  }
  const tree = [
    folder('root', '', [
      folder('bar', 'Bookmarks bar', spec.bar.map(nodeToNode), 'bookmarks-bar'),
      folder('other', 'Other bookmarks', spec.other.map(nodeToNode), 'other'),
      folder('mobile', 'Mobile bookmarks', (spec.mobile ?? []).map(nodeToNode), 'mobile'),
    ]),
  ]
  return { tree, appearance }
}

function treeFor(spec: DemoProfileSpec): BookmarkNode[] {
  return demoTreeFor(spec).tree
}

/** Spread the spec's background over the defaults of its variant so partial specs stay valid. */
function backgroundFor(background: DemoProfileSpec['background']): DemoProfileSpec['background'] {
  return { ...BACKGROUND_DEFAULTS[background.type], ...background }
}

function dataFor(spec: DemoProfileSpec): AppData {
  const background = backgroundFor(spec.background)
  // No saved coordinates: the preview seeds an empty layout and the app places
  // every tile with the same first-fit packing it uses for new bookmarks.
  return {
    ...emptyData({
      ...SETTINGS_DEFAULTS,
      density: 'compact',
      background,
      language: 'en',
    }),
    appearance: demoTreeFor(spec).appearance,
  }
}

function defineProfile(spec: DemoProfileSpec & { id: DemoProfileId }): DemoProfile {
  return {
    id: spec.id,
    label: spec.label,
    mode: spec.mode,
    theme: spec.theme,
    tree: () => treeFor(spec),
    data: () => dataFor(spec),
  }
}

const byId = new Map(DEMO_PROFILE_SPECS.map(spec => [spec.id, defineProfile(spec)]))

function mustGet(id: DemoProfileId): DemoProfile {
  const profile = byId.get(id)
  if (!profile)
    throw new Error(`Demo profile "${id}" is missing from DEMO_PROFILE_SPECS`)
  return profile
}

// The compiler rejects missing, unknown or mistyped keys here, and mustGet
// guards the same invariant at module load. Adding a profile is one spec entry.
export const DEMO_PROFILES: Record<DemoProfileId, DemoProfile> = {
  'daily-work': mustGet('daily-work'),
  'multi-project': mustGet('multi-project'),
  'research': mustGet('research'),
  'travel': mustGet('travel'),
  'cooking': mustGet('cooking'),
}

export function isDemoProfileId(value: unknown): value is DemoProfileId {
  return typeof value === 'string' && DEMO_PROFILE_SPECS.some(spec => spec.id === value)
}

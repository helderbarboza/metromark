import type { AppData, BookmarkNode } from '$lib/types'
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

const PRESENTATION_FALLBACK: AppData = {
  schema: 1,
  appearance: {},
  layouts: {},
  dockLayouts: {},
  settings: { density: 'comfortable', gridView: 'classic', showDomains: true, originalFavicons: false, reducedMotion: false, language: 'auto', background: { type: 'color', auto: true } },
  undos: [],
}

export const test = base.extend<{ noPageErrors: void }>({
  noPageErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await use()
    expect(errors, 'No unhandled browser exceptions, including dialog-close regressions').toEqual([])
  }, { auto: true }],
})
export { expect }
export const group = (page: Page, title: string) => page.locator('[data-testid="metro-group"]').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
/** Tiles are dnd-kit sortables, so they expose role="button" with an "Open …" name. */
export const link = (page: Page, title: string) => page.getByRole('button', { name: new RegExp(`^Open ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) })
/** Folder tiles are buttons named "Folder <name>…". */
export const folderTile = (page: Page, title: string) => page.getByRole('button', { name: new RegExp(`^Folder ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) })
export const draggable = (page: Page, id: string) => page.locator(`a[data-grid-id="${id}"]`)
export const appBar = (page: Page) => page.getByRole('toolbar')
/** Browser context runs outside this module; keep each evaluate body self-contained. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBookmarkNode(value: unknown): value is BookmarkNode {
  if (!isObject(value))
    return false
  return typeof value.id === 'string' && typeof value.title === 'string'
}

function isAppData(value: unknown): value is AppData {
  if (!isObject(value))
    return false
  return typeof value.schema === 'number'
    && isObject(value.appearance)
    && isObject(value.layouts)
    && isObject(value.settings)
}

export async function presentation(page: Page): Promise<AppData> {
  const raw = await page.evaluate((): unknown => {
    try {
      return JSON.parse(localStorage.getItem('metromark.preview.presentation.v1') ?? 'null')
    }
    catch {
      return null
    }
  })
  return isAppData(raw) ? raw : PRESENTATION_FALLBACK
}

export async function tree(page: Page): Promise<BookmarkNode[]> {
  const raw = await page.evaluate((): unknown => {
    try {
      return JSON.parse(localStorage.getItem('metromark.preview.bookmarks.v1') ?? '[]')
    }
    catch {
      return null
    }
  })
  return Array.isArray(raw) ? raw.filter(isBookmarkNode) : []
}
export function flat(nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.flatMap(node => [node, ...flat(node.children ?? [])])
}
export async function start(page: Page) {
  await page.goto('/')
  await expect(link(page, 'Steam')).toBeVisible()
}
/** Tiles select on right-click; commands then come from the app bar. */
export async function rightClick(page: Page, title: string) {
  await link(page, title).click({ button: 'right' })
  await expect(appBar(page)).toBeVisible()
}
/**
 * Right-clicks a group header, which opens the group's context menu.
 * Pre-scrolls the board so the folder is in view: a scroll event dismisses
 * an open context menu, so scrolling must happen before the menu opens.
 */
export async function rightClickGroup(page: Page, title: string) {
  const target = group(page, title)
  await target.evaluate((el) => {
    const board = document.querySelector('#board')
    if (board && el instanceof HTMLElement)
      board.scrollLeft = Math.max(0, el.offsetLeft - 68)
  })
  await target.locator('[data-testid="group-header"]').click({ button: 'right' })
}
/** Opens the app bar's overflow menu, where commands that are not bar commands live. */
export async function moreActions(page: Page, title: string) {
  await page.getByRole('button', { name: `More actions for ${title}`, exact: true }).click()
}

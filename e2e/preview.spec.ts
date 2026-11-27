import type { Settings } from '$lib/config'

import { Buffer } from 'node:buffer'

import {
  appBar,
  draggable,
  expect,
  flat,
  folderTile,
  group,
  link,
  moreActions,
  presentation,
  rightClick,
  rightClickGroup,
  scrollBoardToGroup,
  start,
  test,
  tree,
} from './helpers'

test('flat ancestry, separate roots, launcher tiles, and background context-menu keyboard navigation', async ({ page }) => {
  await start(page)
  await expect(page.locator('[data-testid="metro-group"]')).toHaveCount(7)
  await expect(group(page, 'Tools').locator('[data-testid="group-path"]')).toHaveText('Bookmarks bar / Learning /')
  await expect(link(page, 'Steam')).toHaveAttribute('href', 'https://store.steampowered.com/')
  await expect(link(page, 'Steam')).toHaveAttribute('data-size', 'large')
  await page.getByRole('combobox', { name: 'Bookmark root' }).click()
  await page.getByRole('option', { name: /^Other bookmarks/ }).click()
  await expect(page.locator('[data-testid="metro-group"]')).toHaveCount(1)
  await expect(page.locator('a[data-grid-id]')).toHaveCount(4)
  await expect(group(page, 'Other bookmarks')).toBeVisible()
  await page.getByRole('combobox', { name: 'Bookmark root' }).click()
  await page.getByRole('option', { name: /^All bookmarks/ }).click()
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await expect(page.getByRole('menuitem', { name: 'Add new bookmark', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Add new folder', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
})

test('create, edit, customize, resize, move, delete and Undo; dialogs close without exceptions', async ({ page }) => {
  await start(page)
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Add new bookmark', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title', { exact: true }).fill('QA new favorite')
  await dialog.getByLabel('Website address', { exact: true }).fill('https://example.com/one')
  await dialog.getByRole('button', { name: 'Add bookmark', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(link(page, 'QA new favorite')).toBeVisible()
  // Selection commands live on the app bar; the overflow menu holds the rest.
  await rightClick(page, 'QA new favorite')
  await page.getByRole('button', { name: 'Edit selected bookmark' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title', { exact: true }).fill('QA edited favorite')
  await dialog.getByLabel('Website address', { exact: true }).fill('https://example.com/two')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(link(page, 'QA edited favorite')).toHaveAttribute('href', 'https://example.com/two')
  await rightClick(page, 'QA edited favorite')
  await moreActions(page, 'QA edited favorite')
  await page.getByRole('menuitem', { name: 'Customize tile' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox', { name: 'Tile size', exact: true }).click()
  await page.getByRole('option', { name: 'Wide', exact: true }).click()
  await dialog.getByRole('button', { name: 'Custom color', exact: true }).click()
  await dialog.getByLabel('Custom tile color').evaluate((input: HTMLInputElement) => {
    input.value = '#f7f7f7'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(link(page, 'QA edited favorite')).toHaveCSS('color', 'rgb(0, 0, 0)')
  for (const [raw, display] of [
    ['small', 'Small'],
    ['medium', 'Medium'],
    ['large', 'Large'],
    ['wide', 'Wide'],
  ] as const) {
    await rightClick(page, 'QA edited favorite')
    await page.getByRole('button', { name: `Resize selected tile to ${display}`, exact: true }).click()
    // Small tiles intentionally have no visible title; address via the accessible name.
    await expect(page.locator(`a[data-testid="bookmark-tile"][aria-label^="Open QA edited favorite"][data-size="${raw}"]`)).toHaveCount(1)
  }
  await rightClick(page, 'QA edited favorite')
  await page.getByRole('button', { name: 'Move selected bookmark to another folder' }).click()
  await page.getByRole('dialog').getByLabel('Folder', { exact: true }).selectOption('work')
  await page.getByRole('button', { name: 'Move here' }).click()
  await expect(group(page, 'Work').locator('a[aria-label^="Open QA edited favorite"]')).toHaveCount(1)
  await expect.poll(async () => flat(await tree(page)).find(node => node.title === 'QA edited favorite')?.parentId).toBe('work')
  await rightClick(page, 'QA edited favorite')
  await page.getByRole('button', { name: 'Delete selected bookmark' }).click()
  await expect(link(page, 'QA edited favorite')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(group(page, 'Work').locator('a[data-testid="bookmark-tile"][aria-label^="Open QA edited favorite"][data-size="wide"]')).toHaveCount(1)
  await expect.poll(async () => flat(await tree(page)).filter(node => node.title === 'QA edited favorite').length).toBe(1)
})

test('static tiles keep their geometry transition when resized', async ({ page }) => {
  await start(page)
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('Steam')
  const tile = page.locator('[data-testid="tile-slot"]').first()
  const wrapper = tile.locator('xpath=../..')
  // Search renders tiles outside snapgrid, so the wrapper owns the geometry animation.
  await expect(wrapper).toHaveCSS('transition-property', 'left, top, width, height')
  await expect(wrapper).toHaveCSS('transition-duration', '0.15s')
  await tile.click({ button: 'right' })
  await expect(appBar(page)).toBeVisible()
  await page.getByRole('button', { name: 'Resize selected tile to Small', exact: true }).click()
  await expect(tile).toHaveAttribute('data-size', 'small')
})

test('group header opens its context menu from the keyboard; Escape closes and returns focus', async ({ page }) => {
  await start(page)
  const header = group(page, 'Work').locator('[data-testid="group-header"]')
  await header.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu', { name: 'Actions for Work' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Add new bookmark' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Add new folder' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(header).toBeFocused()
})

test('folder create/rename, flat nested paths, whole-subtree delete and Undo with remapped IDs', async ({ page }) => {
  await start(page)
  await rightClickGroup(page, 'Learning')
  await page.getByRole('menuitem', { name: 'Add new folder' }).click()
  await page.getByRole('dialog').getByLabel('Folder name').fill('QA child')
  await page.getByRole('button', { name: 'Create folder' }).click()
  await expect(group(page, 'QA child').locator('[data-testid="group-path"]')).toHaveText('Bookmarks bar / Learning /')
  await rightClickGroup(page, 'QA child')
  await page.getByRole('menuitem', { name: 'Rename folder' }).click()
  await page.getByRole('dialog').getByLabel('Folder name').fill('QA renamed child')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await rightClickGroup(page, 'QA renamed child')
  await page.getByRole('menuitem', { name: 'Add new bookmark' }).click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('QA nested favorite')
  await page.getByRole('dialog').getByLabel('Website address', { exact: true }).fill('https://example.com/nested')
  await page.getByRole('dialog').getByRole('button', { name: 'Add bookmark', exact: true }).click()
  await rightClickGroup(page, 'Learning')
  await page.getByRole('menuitem', { name: 'Delete folder', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Delete this folder?')
  await page.getByRole('dialog').getByRole('button', { name: 'Delete folder', exact: true }).click()
  await expect(group(page, 'Learning')).toHaveCount(0)
  await expect(group(page, 'Tools')).toHaveCount(0)
  await expect(link(page, 'QA nested favorite')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(group(page, 'QA renamed child').locator('a[aria-label^="Open QA nested favorite"]')).toHaveCount(1)
  await expect(group(page, 'Tools').locator('[data-testid="group-path"]')).toHaveText('Bookmarks bar / Learning /')
  await expect.poll(async () => flat(await tree(page)).filter(node => node.title === 'QA nested favorite').length).toBe(1)
})

test('pointer and keyboard moves persist without reordering native siblings; cancel remains usable', async ({ page }) => {
  await start(page)
  const nativeBefore = await page.evaluate(() => localStorage.getItem('metromark.preview.bookmarks.v1'))
  // Tiles are always movable; no mode has to be entered first.
  const github = draggable(page, 'github')
  await expect(github).toHaveAttribute('data-grid-id', 'github')
  const original = { x: 4, y: 2 }
  const from = (await github.boundingBox())!
  const area = (await group(page, 'Bookmarks bar').locator('[data-testid="metro-grid"]').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, area.y + 50, { steps: 20 })
  await page.mouse.up()
  await expect.poll(async () => {
    const tile = (await presentation(page)).layouts?.bar?.find(item => item.i === 'github')
    return tile
      ? { x: tile.x, y: tile.y }
      : original
  }).not.toEqual(original)
  const afterPointer = (await presentation(page)).layouts.bar.find(item => item.i === 'github')!
  // Space picks the tile up for a keyboard move; Enter keeps activating the bookmark.
  await github.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('[data-testid="grid-placeholder"]')).toHaveCount(1)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await expect.poll(async () => (await presentation(page)).layouts.bar.find(item => item.i === 'github')).not.toEqual(afterPointer)
  expect(await page.evaluate(() => localStorage.getItem('metromark.preview.bookmarks.v1'))).toBe(nativeBefore)
  const saved = (await presentation(page)).layouts.bar
  // Escape cancels a keyboard gesture and leaves the tile in place.
  await github.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('[data-testid="grid-placeholder"]')).toHaveCount(1)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-testid="grid-placeholder"]')).toHaveCount(0)
  await expect(github).toBeVisible()
  expect((await presentation(page)).layouts.bar).toEqual(saved)
  // A pointer drop outside every group also cancels without trapping click suppression.
  const cancelFrom = (await github.boundingBox())!
  await page.mouse.move(cancelFrom.x + 40, cancelFrom.y + 40)
  await page.mouse.down()
  await page.mouse.move(350, 110, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(240) // Match the deliberate post-gesture click-suppression interval.
  await rightClick(page, 'GitHub')
  expect((await presentation(page)).layouts.bar).toEqual(saved)
  await page.reload()
  await expect(link(page, 'GitHub')).toBeVisible()
  expect((await presentation(page)).layouts.bar).toEqual(saved)
})

test('cross-group pointer dragging changes the real parent; Undo restores it', async ({ page }) => {
  await start(page)
  const tile = draggable(page, 'github')
  const source = (await tile.boundingBox())!
  const target = (await group(page, 'Work').locator('[data-testid="metro-grid"]').boundingBox())!
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + 70, target.y + 210, { steps: 35 })
  await page.mouse.up()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'github')?.parentId).toBe('work')
  await expect(group(page, 'Work').locator('a[data-grid-id="github"]')).toHaveCount(1)
  await expect(group(page, 'Bookmarks bar').locator('a[data-grid-id="github"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'github')?.parentId).toBe('bar')
  await expect(group(page, 'Bookmarks bar').locator('a[data-grid-id="github"]')).toHaveCount(1)
})

test('cross-tab updates, search, persistent Paper theme and small-window access', async ({ page, context }) => {
  await start(page)
  const second = await context.newPage()
  await start(second)
  const secondErrors: string[] = []
  second.on('pageerror', error => secondErrors.push(error.message))
  await rightClick(page, 'Steam')
  await page.getByRole('button', { name: 'Edit selected bookmark' }).click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('QA across tabs')
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click()
  await expect(link(second, 'QA across tabs')).toBeVisible()
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Appearance & settings', exact: true }).click()
  await page.getByRole('radio', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Themes', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Catppuccin Mocha', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'catppuccin-mocha')
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'catppuccin-mocha')
  await page.keyboard.press('Escape')
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('QA across')
  await expect(page.locator('a[data-testid="tile-slot"]')).toHaveCount(1)
  // Results are a filtered read-only view: no selection, no dragging while searching.
  await expect(appBar(page)).toHaveCount(0)
  await expect(page.locator('a[data-grid-id]')).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('nothing matches this phrase')
  await expect(page.getByRole('heading', { name: 'No favorites found.' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'catppuccin-mocha')
  await page.setViewportSize({ width: 800, height: 600 })
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Appearance & settings', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('searchbox', { name: 'Search bookmarks' })).toBeVisible()
  expect(secondErrors).toEqual([])
})

test('right-click and keyboard selection open the app bar; Escape and the board clear it', async ({ page }) => {
  await start(page)
  const steam = link(page, 'Steam')
  const bar = appBar(page)
  await steam.click({ button: 'right' })
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('Steam')
  await expect(page.locator('[data-testid="bookmark-tile"][data-selected]')).toHaveCount(1)
  // Right-clicking the same tile again keeps its commands open instead of toggling them away.
  await steam.click({ button: 'right' })
  await expect(bar).toBeVisible()
  // Commands that are not bar commands live in the bar's overflow menu.
  await moreActions(page, 'Steam')
  await expect(page.getByRole('menuitem', { name: 'Open in new tab', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(bar).toBeVisible()
  // Escape clears the selection and hands focus back to the tile it came from.
  await page.keyboard.press('Escape')
  await expect(bar).toHaveCount(0)
  await expect(page.locator('[data-testid="bookmark-tile"][data-selected]')).toHaveCount(0)
  await expect(steam).toBeFocused()
  // The keyboard path moves focus into the bar so its commands are reachable.
  await steam.focus()
  await page.keyboard.press('Shift+F10')
  await expect(bar).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit selected bookmark' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(bar).toHaveCount(0)
  await expect(steam).toBeFocused()
  // Pressing the board drops the selection too.
  await steam.click({ button: 'right' })
  await expect(bar).toBeVisible()
  await page.locator('#board').click({
    position: { x: 25, y: 20 },
  })
  await expect(bar).toHaveCount(0)
})

test('touch cross-slide selects instead of launching, and picks the tile up past the drag threshold', async ({ page }) => {
  await start(page)
  const tile = link(page, 'Steam')
  const box = (await tile.boundingBox())!
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const popups: string[] = []
  page.on('popup', popup => popups.push(popup.url()))
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', point?: { x: number, y: number }) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: point
        ? [point]
        : [],
    })
  // A short drag down self-reveals the check; releasing there selects without launching.
  await touch('touchStart', { x, y })
  await touch('touchMove', { x, y: y + 14 })
  await touch('touchEnd')
  await expect(appBar(page)).toBeVisible()
  await expect(page.locator('[data-testid="bookmark-tile"][data-selected]')).toHaveCount(1)
  expect(popups).toEqual([])
  await page.keyboard.press('Escape')
  await expect(appBar(page)).toHaveCount(0)
  // Continuing past the drag threshold hands the tile to the grid instead of selecting it.
  const box2 = (await tile.boundingBox())!
  const x2 = Math.round(box2.x + box2.width / 2)
  const y2 = Math.round(box2.y + box2.height / 2)
  await touch('touchStart', { x: x2, y: y2 })
  await touch('touchMove', { x: x2, y: y2 + 40 })
  await expect(page.locator('[data-testid="grid-placeholder"]')).toHaveCount(1)
  await touch('touchEnd')
  await expect(page.locator('[data-testid="grid-placeholder"]')).toHaveCount(0)
  expect(popups).toEqual([])
})

test('theme accent foreground contrast adapts to mode and theme', async ({ page }) => {
  await start(page)

  // In catppuccin-latte (initial), Notion has colorIndex 3 -> base0B #40a02b (green)
  // which should produce black text.
  const notion = link(page, 'Notion')
  await expect(notion).toHaveCSS('color', 'rgb(0, 0, 0)')

  // Steam has colorIndex 0 -> base08 #d20f39 (red) which should produce white text.
  const steam = link(page, 'Steam')
  await expect(steam).toHaveCSS('color', 'rgb(255, 255, 255)')

  // Switch to dark mode (catppuccin-mocha) via Appearance dialog
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Appearance & settings', exact: true }).click()
  await page.getByRole('radio', { name: 'Dark', exact: true }).click()
  await page.keyboard.press('Escape')

  // In catppuccin-mocha all accent colors are bright, so both tiles should have black text now.
  await expect(notion).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(steam).toHaveCSS('color', 'rgb(0, 0, 0)')

  // Switch back to light mode
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Appearance & settings', exact: true }).click()
  await page.getByRole('radio', { name: 'Light', exact: true }).click()
  await page.keyboard.press('Escape')

  // Back to catppuccin-latte: Notion black, Steam white.
  await expect(notion).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(steam).toHaveCSS('color', 'rgb(255, 255, 255)')

  // Switch theme to one-light (another light theme with different accent colors)
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Appearance & settings', exact: true }).click()
  await page.getByRole('button', { name: 'Themes', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'One Light', exact: true }).click()
  await page.keyboard.press('Escape')

  // In one-light, colorIndex 3 -> base0B #50a14f (green) -> black
  // colorIndex 0 -> base08 #ca1243 (red) -> white
  await expect(notion).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(steam).toHaveCSS('color', 'rgb(255, 255, 255)')
})

test('factory reset restores MetroMark defaults and keeps sample bookmarks', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(draggable(page, 'steam')).toBeVisible()
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Appearance & settings', exact: true }).click()
  await page.getByRole('tab', { name: 'Tiles', exact: true }).click()
  await page.getByRole('radio', { name: 'Compact', exact: true }).click()
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await page.getByRole('button', { name: 'Themes', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'One Light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'one-light')

  await page.getByRole('tab', { name: 'Advanced', exact: true }).click()
  await page.getByRole('button', { name: 'Factory reset', exact: true }).click()
  await expect(page.getByText('Reset MetroMark to factory defaults?')).toBeVisible()
  await page.getByRole('button', { name: 'Reset MetroMark', exact: true }).click()

  await expect(page.getByRole('complementary', { name: 'Settings' })).toHaveCount(0)
  await expect(page.locator('[data-sonner-toast]')).toContainText('MetroMark reset to factory defaults')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'catppuccin-latte')
  await expect(draggable(page, 'steam')).toBeVisible()
  const saved = await page.evaluate(() => {
    const value: unknown = JSON.parse(localStorage.getItem('metromark.preview.presentation.v1') ?? '{}')
    if (
      typeof value !== 'object'
      || value === null
      || !('appearance' in value)
      || !('layouts' in value)
      || !('undos' in value)
      || !('settings' in value)
    ) {
      throw new Error('Missing presentation data.')
    }
    return {
      appearance: value.appearance,
      layouts: value.layouts,
      undos: value.undos,
      settings: value.settings,
    }
  })
  expect(saved.appearance).toEqual({})
  expect(saved.layouts).toEqual({})
  expect(saved.undos).toEqual([])
  expect(saved.settings).toEqual({
    density: 'comfortable',
    gridView: 'classic',
    showDomains: true,
    originalFavicons: true,
    reducedMotion: false,
    language: 'auto',
    backgroundMode: 'fullScreen',
    // Keep in sync with SETTINGS_DEFAULTS in src/lib/config.ts.
    background: {
      auto: true,
      type: 'color',
    },
  })
})

test('folder tiles render with previews and scroll to their group', async ({ page }) => {
  await start(page)
  // Direct subfolders become tiles in their parent group.
  const workTile = group(page, 'Bookmarks bar').locator('button[data-grid-id="work"]')
  await expect(workTile).toBeVisible()
  await expect(workTile).toHaveAttribute('aria-label', /^Folder Work\b/)
  await expect(workTile).toHaveAttribute('data-size', 'medium')
  // The folder's own group keeps its bookmark tiles plus its subfolder tile.
  await expect(group(page, 'Learning').locator('button[data-grid-id="tools"]')).toBeVisible()
  await expect(group(page, 'Tools').locator('a[data-grid-id="storybook"]')).toBeVisible()
  // Activating the folder tile pans the board and flashes its folder.
  const before = await page.locator('#board').evaluate(element => element.scrollLeft)
  await workTile.click()
  await expect.poll(async () => page.locator('#board').evaluate(element => element.scrollLeft)).toBeGreaterThan(before)
  await expect(group(page, 'Work')).toHaveClass(/animate-flash/)
  // The flash clears after ~1s.
  await expect(group(page, 'Work')).not.toHaveClass(/animate-flash/, { timeout: 2500 })
})

test('folder tiles resize, rename, move and cannot be deleted', async ({ page }) => {
  await start(page)
  const workTile = group(page, 'Bookmarks bar').locator('button[data-grid-id="work"]')
  await workTile.click({ button: 'right' })
  const bar = appBar(page)
  await expect(bar).toContainText('Work')
  await expect(page.getByRole('button', { name: 'Delete selected bookmark' })).toHaveCount(0)
  // Resize via the app bar presets.
  await page.getByRole('button', { name: 'Resize selected tile to Large', exact: true }).click()
  await expect(group(page, 'Bookmarks bar').locator('button[data-grid-id="work"]')).toHaveAttribute('data-size', 'large')
  // Rename via the app bar.
  await folderTile(page, 'Work').click({ button: 'right' })
  await page.getByRole('button', { name: 'Rename selected folder', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Folder name').fill('QA renamed work')
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click()
  await expect(group(page, 'QA renamed work')).toBeVisible()
  // Move via the app bar.
  await folderTile(page, 'QA renamed work').click({ button: 'right' })
  await page.getByRole('button', { name: 'Move selected folder to another folder', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Folder', { exact: true }).selectOption('other')
  await page.getByRole('dialog').getByRole('button', { name: 'Move here', exact: true }).click()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'work')?.parentId).toBe('other')
  await expect(group(page, 'Other bookmarks').locator('button[data-grid-id="work"]')).toBeVisible()
})

test('cross-group pointer dragging moves the real folder; Undo restores it', async ({ page }) => {
  await start(page)
  const tile = group(page, 'Learning').locator('button[data-grid-id="tools"]')
  const source = (await tile.boundingBox())!
  const target = (await group(page, 'Inspiration').locator('[data-testid="metro-grid"]').boundingBox())!
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + 70, target.y + 210, { steps: 35 })
  await page.mouse.up()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'tools')?.parentId).toBe('inspiration')
  await expect(group(page, 'Inspiration').locator('button[data-grid-id="tools"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'tools')?.parentId).toBe('learning')
})

test('folder tiles appear and disappear with the search filter, read-only', async ({ page }) => {
  await start(page)
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('zzz-no-match-zzz')
  await expect(page.locator('button[data-tile-id]')).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('learning')
  // The Learning group itself matches via its path; its folder tile is part of the read-only view.
  await expect(page.locator('button[data-tile-id="tools"]')).toHaveCount(1)
  // Read-only while searching: no app bar.
  await expect(appBar(page)).toHaveCount(0)
})

test('folder tiles accept custom colors from the shared appearance dialog', async ({ page }) => {
  await start(page)
  const workTile = group(page, 'Bookmarks bar').locator('button[data-grid-id="work"]')
  // The folder chrome is intentionally not baked in: no flat amber anymore.
  const defaultBackground = await workTile.evaluate(element => getComputedStyle(element).getPropertyValue('--tile-bg').trim())
  expect(defaultBackground).not.toBe('')
  await workTile.click({ button: 'right' })
  await page.getByRole('button', { name: 'More actions for Work', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Customize tile', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('A little personality for')).toBeVisible()
  await dialog.getByRole('button', { name: 'Custom color', exact: true }).click()
  await dialog.getByLabel('Custom tile color').evaluate((input: HTMLInputElement) => {
    input.value = '#f7f7f7'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(async () => workTile.evaluate(element => getComputedStyle(element).getPropertyValue('--tile-bg').trim())).toBe('#f7f7f7')
  // The appearance is local metadata; the folder itself stays untouched.
  expect((await presentation(page)).appearance.work?.color).toBe('#f7f7f7')
  // The folder tile still cannot be deleted from its menus.
  await folderTile(page, 'Work').click({ button: 'right' })
  await expect(page.getByRole('button', { name: 'Delete selected bookmark' })).toHaveCount(0)
})

test('add dialogs save the color set during creation', async ({ page }) => {
  await start(page)

  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Add new bookmark', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title', { exact: true }).fill('QA colored bookmark')
  await dialog.getByLabel('Website address', { exact: true }).fill('https://example.com/colored')
  await dialog.getByRole('button', { name: 'Custom color', exact: true }).click()
  await dialog.getByLabel('Custom tile color').evaluate((input: HTMLInputElement) => {
    input.value = '#f7f7f7'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await dialog.getByRole('button', { name: 'Add bookmark', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  let newId = ''
  await expect.poll(async () => {
    newId = flat(await tree(page)).find(node => node.title === 'QA colored bookmark')?.id ?? ''
    return newId
  }).not.toBe('')
  expect((await presentation(page)).appearance[newId]?.color).toBe('#f7f7f7')

  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Add new folder', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Folder name', { exact: true }).fill('QA colored folder')
  await dialog.getByRole('button', { name: 'Use theme color 3', exact: true }).click()
  await dialog.getByRole('button', { name: 'Create folder', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(async () => {
    newId = flat(await tree(page)).find(node => node.title === 'QA colored folder')?.id ?? ''
    return newId
  }).not.toBe('')
  expect((await presentation(page)).appearance[newId]).toEqual({ colorIndex: 2 })
})

test('create a folder from the board menu, then drop a bookmark onto it', async ({ page }) => {
  await start(page)
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Add new folder', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Folder name', { exact: true }).fill('QA drop target')
  await dialog.getByLabel('Create inside', { exact: true }).selectOption('other')
  await dialog.getByRole('button', { name: 'Create folder', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  // The tree is the source of truth for the new folder's id; its group is
  // appended after the groups of its parent.
  let newId = ''
  await expect.poll(async () => {
    newId = flat(await tree(page)).find(node => node.title === 'QA drop target')?.id ?? ''
    return newId
  }).not.toBe('')
  const created = group(page, 'QA drop target')
  await expect(created).toBeVisible()
  await expect(group(page, 'Other bookmarks').locator(`button[data-grid-id="${newId}"]`)).toBeVisible()
  await scrollBoardToGroup(page, 'other')
  // Drop YouTube (a child of Other bookmarks) onto the new, empty folder.
  const tile = draggable(page, 'youtube')
  const source = (await tile.boundingBox())!
  const target = (await created.locator('[data-testid="metro-grid"]').boundingBox())!
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + 70, target.y + 60, { steps: 30 })
  await page.mouse.up()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'youtube')?.parentId).toBe(newId)
  await expect(created.locator('a[data-grid-id="youtube"]')).toHaveCount(1)
})

test('a new folder cannot be moved into itself, but accepts a bookmark drop', async ({ page }) => {
  await start(page)
  await page.locator('#board').click({
    button: 'right',
    position: { x: 25, y: 20 },
  })
  await page.getByRole('menuitem', { name: 'Add new folder', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Folder name', { exact: true }).fill('QA self move')
  await dialog.getByLabel('Create inside', { exact: true }).selectOption('other')
  await dialog.getByRole('button', { name: 'Create folder', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  let newId = ''
  await expect.poll(async () => {
    newId = flat(await tree(page)).find(node => node.title === 'QA self move')?.id ?? ''
    return newId
  }).not.toBe('')
  await scrollBoardToGroup(page, 'other')
  const created = group(page, 'QA self move')
  const grid = created.locator('[data-testid="metro-grid"]')
  // Dropping the folder's own tile onto its own group is rejected with an error toast.
  const ownTile = group(page, 'Other bookmarks').locator(`button[data-grid-id="${newId}"]`)
  const source = (await ownTile.boundingBox())!
  // Keep the drag on the tile's own row: a diagonal gesture escapes the drop feedback.
  const y = Math.round(source.y + source.height / 2)
  const gridBox = (await grid.boundingBox())!
  await page.mouse.move(source.x + source.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(gridBox.x + 100, y, { steps: 20 })
  await page.waitForTimeout(200)
  await page.mouse.up()
  await expect(page.locator('[data-sonner-toast]')).toContainText('A folder cannot be moved into itself or a descendant.')
  await expect(group(page, 'Other bookmarks').locator(`button[data-grid-id="${newId}"]`)).toHaveCount(1)
  // A bookmark can be dropped into the new folder instead.
  const tile = draggable(page, 'youtube')
  const from = (await tile.boundingBox())!
  const to = (await grid.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + 70, to.y + 60, { steps: 30 })
  await page.mouse.up()
  await expect.poll(async () => flat(await tree(page)).find(node => node.id === 'youtube')?.parentId).toBe(newId)
  await expect(created.locator('a[data-grid-id="youtube"]')).toHaveCount(1)
})

test('image tile background clips the live background to tile shapes', async ({ page }) => {
  await start(page)
  const data = await presentation(page)
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">'
    + '<rect width="100" height="100" fill="#ff0000"/>'
    + '<rect x="100" width="100" height="100" fill="#0000ff"/></svg>'
  const background: Settings['background'] = {
    type: 'image',
    url: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    fit: 'fill',
    opacity: 1,
    parallax: true,
    parallaxZoom: 2,
  }
  data.settings = {
    ...data.settings,
    backgroundMode: 'tile',
    background,
  }
  await page.evaluate((value) => {
    localStorage.setItem('metromark.preview.presentation.v1', JSON.stringify(value))
  }, data)
  await page.reload()
  await expect(link(page, 'Steam')).toBeVisible()

  const layer = page.getByTestId('page-background')
  await expect(layer).toHaveCSS('filter', 'brightness(0.76)')
  await expect.poll(async () => layer.evaluate(element =>
    getComputedStyle(element).clipPath.startsWith('path('))).toBe(true)
  await expect(layer.locator('img[aria-hidden="true"]')).toHaveCount(1)

  const clipBefore = await layer.evaluate(element => getComputedStyle(element).clipPath)
  await page.locator('#board').evaluate((board) => {
    board.scrollLeft = board.scrollWidth
  })
  await expect.poll(async () => layer.evaluate((element, before) => {
    return getComputedStyle(element).clipPath !== before
  }, clipBefore)).toBe(true)
})

test('shader tile background clips the live canvas to tile shapes', async ({ page }) => {
  await start(page)
  const data = await presentation(page)
  const background: Settings['background'] = {
    type: 'shader',
    shaderId: 'flow',
    paused: false,
    opacity: 1,
    auto: true,
  }
  data.settings = {
    ...data.settings,
    backgroundMode: 'tile',
    background,
  }
  await page.evaluate((value) => {
    localStorage.setItem('metromark.preview.presentation.v1', JSON.stringify(value))
  }, data)
  await page.reload()
  await expect(link(page, 'Steam')).toBeVisible()

  const layer = page.getByTestId('page-background')
  await expect(layer).toHaveCSS('filter', 'brightness(0.76)')
  await expect(layer.locator('canvas')).toHaveCount(1)
  await expect.poll(async () => layer.evaluate(element =>
    getComputedStyle(element).clipPath.startsWith('path('))).toBe(true)

  const clipBefore = await layer.evaluate(element => getComputedStyle(element).clipPath)
  await page.locator('#board').evaluate((board) => {
    board.scrollLeft = board.scrollWidth
  })
  await expect.poll(async () => layer.evaluate((element, before) => {
    return getComputedStyle(element).clipPath !== before
  }, clipBefore)).toBe(true)
})

test('youtube tile background clips the live embed to tile shapes', async ({ page }) => {
  await start(page)
  const data = await presentation(page)
  const background: Settings['background'] = {
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=JBoUwElRFVM&list=PLZHdY_46KnYuY7kUUXm__NrLMEll8IGGX',
    fit: 'cover',
    opacity: 1,
    parallax: false,
    parallaxZoom: 1.5,
    playbackRate: 1,
    paused: false,
    playlistOrder: 'shuffle',
    auto: true,
  }
  data.settings = {
    ...data.settings,
    backgroundMode: 'tile',
    background,
  }
  await page.evaluate((value) => {
    localStorage.setItem('metromark.preview.presentation.v1', JSON.stringify(value))
  }, data)
  await page.reload()
  await expect(link(page, 'Steam')).toBeVisible()

  const layer = page.getByTestId('page-background')
  await expect(layer).toHaveCSS('opacity', '1')
  await expect.poll(async () => layer.evaluate(element =>
    getComputedStyle(element).clipPath.startsWith('path('))).toBe(true)
  await expect.poll(async () => page.locator('iframe').count()).toBe(1)

  const clipBefore = await layer.evaluate(element => getComputedStyle(element).clipPath)
  await page.locator('#board').evaluate((board) => {
    board.scrollLeft = board.scrollWidth
  })
  await expect.poll(async () => layer.evaluate((element, before) => {
    return getComputedStyle(element).clipPath !== before
  }, clipBefore)).toBe(true)
})

test('tile background cells reveal the configured background color', async ({ page }) => {
  await start(page)
  const data = await presentation(page)
  data.settings = {
    ...data.settings,
    backgroundMode: 'tile',
    background: { type: 'color', auto: false, color: '#123456' },
  }
  await page.evaluate((value) => {
    localStorage.setItem('metromark.preview.presentation.v1', JSON.stringify(value))
  }, data)
  await page.reload()
  await expect(link(page, 'Steam')).toBeVisible()

  const layer = page.getByTestId('page-background')
  await expect(layer).toHaveCSS('filter', 'none')
  const background = await layer.evaluate((element) => {
    const colorLayer = element.firstElementChild?.firstElementChild
    return colorLayer
      ? getComputedStyle(colorLayer).backgroundColor
      : null
  })
  expect(background).toBe('rgb(18, 52, 86)')

  const transparent = await page.locator('[data-preview-cell]').evaluateAll((cells) => {
    return cells.some((cell) => {
      const fill = cell.firstElementChild?.firstElementChild
      return fill !== null && fill !== undefined
        && getComputedStyle(fill).backgroundColor === 'rgba(0, 0, 0, 0)'
    })
  })
  expect(transparent).toBe(true)

  // Folder tiles contribute their individual cells as clip regions, so the
  // 1px layout gaps stay outside the clip and show the page color.
  const tiles = await page.locator('[data-tile-background]').count()
  const regions = await page.locator('[data-background-region]').count()
  expect(regions).toBeGreaterThan(tiles)
})

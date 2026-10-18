import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { download } from 'geckodriver'
import { firefox } from 'playwright'
import { Builder, By, until } from 'selenium-webdriver'
import { Options, ServiceBuilder } from 'selenium-webdriver/firefox.js'
import { archiveFolder } from './archive.mjs'

// A disposable profile only; never opens or changes the user's browser profile.
const temporary = await mkdtemp(path.join(os.tmpdir(), 'metro-firefox-'))
const zip = path.join(temporary, 'extension.zip')
await writeFile(zip, await archiveFolder(path.resolve('.output/firefox-mv3')))
process.env.MOZ_DISABLE_CONTENT_SANDBOX = '1'
const options = new Options().setBinary(process.env.FIREFOX_BINARY ?? firefox.executablePath()).addArguments('-headless').setPreference('browser.newtabpage.enabled', true)
let driver
try {
  // Geckodriver's flag, not a Firefox capability, grants the test chrome context.
  const service = new ServiceBuilder(await download()).addArguments('--allow-system-access')
  driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).setFirefoxService(service).build()
  const addon = await driver.installAddon(zip, true)
  assert.equal(addon, 'metro-bookmarks@local.example')
  const before = await driver.getAllWindowHandles()
  await driver.setContext('chrome')
  const override = await driver.executeScript('const {AboutNewTab}=ChromeUtils.importESModule(\'resource:///modules/AboutNewTab.sys.mjs\');return AboutNewTab.newTabURL')
  assert.match(override, /^moz-extension:\/\/[^/]+\/newtab\.html$/)
  // The actual browser New Tab command follows the registered override.
  await driver.executeScript('BrowserCommands.openTab()')
  await driver.setContext('content')
  const handles = await driver.wait(async () => {
    const value = await driver.getAllWindowHandles()
    return value.length > before.length ? value : false
  }, 10000)
  await driver.switchTo().window(handles.find(handle => !before.includes(handle)))
  await driver.wait(until.elementLocated(By.css('.metro-group')), 20000)
  assert.match(await driver.findElement(By.css('footer')).getText(), /bookmarks, \d+ folders/)
  assert.equal(await driver.getCurrentUrl(), override)
  console.log('PASS Firefox native new-tab override and connected boot')

  const bookmark = await driver.executeScript('return browser.bookmarks.getTree().then(tree=>browser.bookmarks.create({parentId:tree[0].children.find(n=>n.id===\'toolbar_____\')?.id??tree[0].children[0].id,title:\'Firefox native favorite\',url:\'https://example.com/\'}))')
  await driver.wait(until.elementLocated(By.css('a[aria-label^="Open Firefox native favorite"]')), 10000)
  await driver.executeScript('return browser.bookmarks.update(arguments[0],{title:"Firefox external edit"})', bookmark.id)
  await driver.wait(until.elementLocated(By.css('a[aria-label^="Open Firefox external edit"]')), 10000)
  console.log('PASS Firefox native API create/edit → open new-tab page')

  await driver.actions().contextClick(await driver.findElement(By.css('a[aria-label^="Open Firefox external edit"]'))).perform()
  await driver.findElement(By.xpath('//button[@role="menuitem" and normalize-space(.)="Delete bookmark"]')).click()
  await driver.wait(async () => (await driver.findElements(By.css('a[aria-label^="Open Firefox external edit"]'))).length === 0, 10000)
  assert.equal(await driver.executeScript('return browser.bookmarks.search({title:"Firefox external edit"}).then(nodes=>nodes.length)'), 0)
  await driver.findElement(By.xpath('//button[normalize-space(.)="Undo"]')).click()
  await driver.wait(until.elementLocated(By.css('a[aria-label^="Open Firefox external edit"]')), 10000)
  assert.equal(await driver.executeScript('return browser.bookmarks.search({title:"Firefox external edit"}).then(nodes=>nodes.length)'), 1)
  console.log('PASS Firefox tile delete → native bookmark removal; Undo → native restoration')

  // Another actual browser new tab subscribes to the same native state.
  const first = await driver.getWindowHandle()
  const oldHandles = await driver.getAllWindowHandles()
  await driver.setContext('chrome')
  await driver.executeScript('BrowserCommands.openTab()')
  await driver.setContext('content')
  const nextHandles = await driver.wait(async () => {
    const value = await driver.getAllWindowHandles()
    return value.length > oldHandles.length ? value : false
  }, 10000)
  await driver.switchTo().window(nextHandles.find(handle => !oldHandles.includes(handle)))
  await driver.wait(until.elementLocated(By.css('a[aria-label^="Open Firefox external edit"]')), 10000)
  const restored = await driver.executeScript('return browser.bookmarks.search({title:"Firefox external edit"}).then(nodes=>nodes[0])')
  await driver.executeScript('return browser.bookmarks.update(arguments[0],{title:"Firefox across tabs"})', restored.id)
  await driver.wait(until.elementLocated(By.css('a[aria-label^="Open Firefox across tabs"]')), 10000)
  await driver.switchTo().window(first)
  await driver.wait(until.elementLocated(By.css('a[aria-label^="Open Firefox across tabs"]')), 10000)
  console.log('PASS Firefox real-time native updates across two new-tab pages')
  await writeFile('release/firefox-verification.txt', 'Firefox native new-tab override, connected boot, native API create/edit, tile delete/Undo, and cross-tab updates: PASS\n')
}
catch (error) {
  if (driver) {
    await driver.setContext('content')
    console.error('Failed URL:', await driver.getCurrentUrl())
    console.error('Failed body:', (await driver.findElement(By.css('body')).getText()).slice(0, 2400))
  }
  throw error
}
finally {
  if (driver)
    await driver.quit()
  await rm(temporary, { recursive: true, force: true })
}

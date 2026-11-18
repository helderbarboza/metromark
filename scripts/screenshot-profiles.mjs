// Captures one screenshot per seeded demo profile into release/screenshots/.
// Output names mirror the profile ids. The directory is gitignored scratch output.
// The script reuses a server on 127.0.0.1:5173 when one responds.
// Otherwise it starts `vite` on that port and stops it on exit.
// Keep DEMO_PROFILE_IDS in sync with src/lib/demo-profiles.ts.
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const HOST = '127.0.0.1'
const PORT = 5173
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? `http://${HOST}:${PORT}`
const OUTPUT_DIR = path.resolve('release/screenshots')
const VIEWPORT = { width: 1280, height: 800 }
const SETTLE_MS = 2500
const DEMO_PROFILE_IDS = ['gamer', 'traveler', 'home-cook']

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function serverResponds() {
  try {
    const response = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(2000),
    })
    return response.ok
  }
  catch {
    return false
  }
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await serverResponds())
      return true
    await sleep(500)
  }
  return false
}

let server = null
if (!(await serverResponds())) {
  console.log('Starting the preview server on port', PORT)
  server = spawn('npx', [
    'vite',
    '--host',
    HOST,
    '--port',
    String(PORT),
    '--strictPort',
  ], { stdio: 'ignore' })
  process.on('exit', () => {
    server?.kill()
  })
  if (!(await waitForServer(60_000))) {
    server.kill()
    console.error('The preview server did not start within 60 seconds.')
    process.exit(1)
  }
}

await mkdir(OUTPUT_DIR, { recursive: true })

const browser = await chromium.launch()
let failed = false
try {
  for (const id of DEMO_PROFILE_IDS) {
    // A fresh context has empty storage, so each profile seeds from scratch.
    const context = await browser.newContext({ viewport: VIEWPORT })
    const page = await context.newPage()
    const problems = []
    page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error')
        problems.push(`console.error: ${message.text()}`)
    })
    await page.goto(`${BASE_URL}/?profile=${id}&clean=1`, { waitUntil: 'load' })
    await page.waitForSelector('[data-testid="metro-group"]', { timeout: 15_000 })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(SETTLE_MS)
    const file = path.join(OUTPUT_DIR, `${id}.png`)
    await page.screenshot({ path: file })
    console.log(`Wrote ${file}`)
    for (const problem of problems)
      console.warn(`  warning (${id}): ${problem}`)
    if (problems.length > 0)
      failed = true
    await context.close()
  }
}
finally {
  await browser.close()
  server?.kill()
}

process.exit(failed ? 1 : 0)

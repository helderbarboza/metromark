import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { zipSync } from 'fflate'
import { archiveFolder, folderEntries } from './archive.mjs'

const root = path.resolve(import.meta.dirname, '..')
process.chdir(root)
const { version } = JSON.parse(await readFile('package.json', 'utf8'))
await mkdir('release', { recursive: true })
for (const browser of ['chrome', 'firefox']) {
  const directory = `release/${browser}-mv3`
  await rm(directory, { recursive: true, force: true })
  await cp(`.output/${browser}-mv3`, directory, { recursive: true })
  await writeFile(`release/metromark-${browser}-${version}.zip`, await archiveFolder(directory))
}
await cp(`release/metromark-firefox-${version}.zip`, `release/metromark-firefox-${version}-unsigned.xpi`)
await cp('PRIVACY.md', 'release/PRIVACY.md')
await cp('NOTICE.md', 'release/NOTICE.md')

const source = {}
for (const directory of [
  'src',
  'public',
  '.storybook',
  'tests',
  'e2e',
  'scripts',
  'docs',
]) Object.assign(source, await folderEntries(directory, `metromark/${directory}/`))
for (const file of [
  'package.json',
  'package-lock.json',
  '.nvmrc',
  '.gitignore',
  'PRIVACY.md',
  'NOTICE.md',
  'wxt.config.ts',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'tsconfig.json',
  'svelte.config.js',
  'eslint.config.mjs',
  'index.html',
]) {
  source[`metromark/${file}`] = new Uint8Array(await readFile(file))
}
const sourceName = `metromark-source-${version}.zip`
await writeFile(`release/${sourceName}`, zipSync(source, { level: 6 }))
const bundle = {
  ...await folderEntries('release/chrome-mv3', 'chrome-mv3/'),
  ...await folderEntries('release/firefox-mv3', 'firefox-mv3/'),
}
for (const file of [
  'PRIVACY.md',
  'NOTICE.md',
  sourceName,
  `metromark-firefox-${version}-unsigned.xpi`,
]) bundle[file] = new Uint8Array(await readFile(`release/${file}`))
await writeFile(`release/metromark-${version}-bundle.zip`, zipSync(bundle, { level: 6 }))
const artifacts = [
  `metromark-${version}-bundle.zip`,
  `metromark-chrome-${version}.zip`,
  `metromark-firefox-${version}.zip`,
  `metromark-firefox-${version}-unsigned.xpi`,
  sourceName,
]
const hashes = []
for (const name of artifacts) {
  const bytes = await readFile(`release/${name}`)
  hashes.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`)
  console.log(`${name}: ${(bytes.length / 1024).toFixed(1)} KiB`)
}
await writeFile('release/SHA256SUMS.txt', `${hashes.join('\n')}\n`)
console.log('Unpacked builds, browser packages, editable source, and checksums saved in release/.')

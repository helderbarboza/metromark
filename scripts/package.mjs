import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
import { archiveFolder, folderEntries } from './archive.mjs';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('release', { recursive: true });
for (const browser of ['chrome', 'firefox']) {
  const directory = `release/${browser}-mv3`;
  await rm(directory, { recursive: true, force: true });
  await cp(`.output/${browser}-mv3`, directory, { recursive: true });
  await writeFile(`release/metro-bookmarks-${browser}-${version}.zip`, await archiveFolder(directory));
}
await cp(`release/metro-bookmarks-firefox-${version}.zip`, `release/metro-bookmarks-firefox-${version}-unsigned.xpi`);
await cp('docs/INSTALL.md', 'release/INSTALL.md');
await cp('PRIVACY.md', 'release/PRIVACY.md');
await cp('NOTICE.md', 'release/NOTICE.md');

const source = {};
for (const directory of ['src', 'public', '.storybook', 'tests', 'e2e', 'scripts', 'docs']) Object.assign(source, await folderEntries(directory, `metro-bookmarks/${directory}/`));
for (const file of ['package.json', 'package-lock.json', '.nvmrc', '.gitignore', 'README.md', 'PRIVACY.md', 'NOTICE.md', 'wxt.config.ts', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tsconfig.json', 'svelte.config.js', 'eslint.config.js', 'index.html']) {
  source[`metro-bookmarks/${file}`] = new Uint8Array(await readFile(file));
}
const sourceName = `metro-bookmarks-source-${version}.zip`;
await writeFile(`release/${sourceName}`, zipSync(source, { level: 6 }));
const bundle = {
  ...await folderEntries('release/chrome-mv3', 'chrome-mv3/'),
  ...await folderEntries('release/firefox-mv3', 'firefox-mv3/'),
};
for (const file of ['INSTALL.md', 'PRIVACY.md', 'NOTICE.md', sourceName, `metro-bookmarks-firefox-${version}-unsigned.xpi`]) bundle[file] = new Uint8Array(await readFile(`release/${file}`));
await writeFile(`release/metro-bookmarks-${version}-bundle.zip`, zipSync(bundle, { level: 6 }));
const artifacts = [`metro-bookmarks-${version}-bundle.zip`, `metro-bookmarks-chrome-${version}.zip`, `metro-bookmarks-firefox-${version}.zip`, `metro-bookmarks-firefox-${version}-unsigned.xpi`, sourceName];
const hashes = [];
for (const name of artifacts) {
  const bytes = await readFile(`release/${name}`);
  hashes.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  console.log(`${name}: ${(bytes.length / 1024).toFixed(1)} KiB`);
}
await writeFile('release/SHA256SUMS.txt', hashes.join('\n') + '\n');
console.log('Unpacked builds, browser packages, editable source, installation guide, and checksums saved in release/.');

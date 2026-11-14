// Regenerates the theme-dependent regions of src/styles.css and public/init-mode.js
// from src/lib/themes.ts (the single source of truth). Run after editing themes.ts.
//   npm run generate:themes          rewrite the marked regions
//   npm run generate:themes -- --check   exit 1 if the regions are out of date
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, THEMES } from '../src/lib/themes.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')

const BASE_SLOTS = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0A', '0B', '0C', '0D', '0E', '0F']

function luminance(hex) {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
    .map(v => Number.parseInt(v, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function mixHex(fg, bg, t) {
  const channels = [0, 2, 4].map((offset) => {
    const a = Number.parseInt(fg.slice(1 + offset, 3 + offset), 16)
    const b = Number.parseInt(bg.slice(1 + offset, 3 + offset), 16)
    return Math.round(a + (b - a) * t)
  })
  return `#${channels.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * muted-foreground is NOT a base slot: the gallery base04 is dimmer than 4.5:1
 * against base00 in 7 of the 12 themes. Instead, blend base05 (the foreground)
 * toward base00 until the contrast against base00 stays at 4.5:1. Keeps every
 * theme as dim as readable, deterministically, with no per-theme exceptions.
 * Throws if the foreground itself does not reach 4.5:1.
 */
function mutedForeground(theme) {
  if (contrastRatio(theme.base05, theme.base00) < 4.5)
    throw new Error(`Theme ${theme.name}: foreground does not reach 4.5:1 against its background`)
  let lo = 0 // blend factor; ratio >= 4.5 here
  let hi = 1 // blend factor; ratio < 4.5 here
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (contrastRatio(mixHex(theme.base05, theme.base00, mid), theme.base00) >= 4.5)
      lo = mid
    else
      hi = mid
  }
  return mixHex(theme.base05, theme.base00, lo)
}

function themeBlock(theme) {
  const selector = theme.mode === 'light'
    ? `:root[data-theme='${theme.name}'],\n.theme-preview[data-theme='${theme.name}'] {`
    : `.dark[data-theme='${theme.name}'],\n.theme-preview.dark[data-theme='${theme.name}'] {`
  const vars = [
    `  --background: ${theme.base00};`,
    `  --card: ${theme.base01};`,
    `  --accent: ${theme.base02};`,
    `  --border: ${theme.base02};`,
    `  --foreground: ${theme.base05};`,
    `  --muted-foreground: ${mutedForeground(theme)}; /* derived: base05 blended toward base00 to 4.5:1 */`,
    `  --primary: ${theme.base0D};`,
    `  --primary-foreground: ${theme.base00};`,
    ...BASE_SLOTS.map(slot => `  --base${slot}: ${theme[`base${slot}`]};`),
  ]
  return `${selector}\n${vars.join('\n')}\n}`
}

function generateStylesRegion() {
  return `${THEMES.map(themeBlock).join('\n\n')}\n`
}

function generateInitModeRegion() {
  const lines = [
    `  var DEFAULT_LIGHT_THEME = '${DEFAULT_LIGHT_THEME}'`,
    `  var DEFAULT_DARK_THEME = '${DEFAULT_DARK_THEME}'`,
    '  var THEME_COLORS = {',
    ...THEMES.map(theme => `    '${theme.name}': '${theme.base00}',`),
    '  }',
  ]
  return `${lines.join('\n')}\n`
}

function replaceRegion(content, beginMarker, endMarker, replacement) {
  const begin = content.indexOf(beginMarker)
  if (begin === -1)
    throw new Error(`Begin marker not found: ${beginMarker}`)
  const beginLineEnd = content.indexOf('\n', begin) + 1
  const end = content.indexOf(endMarker, beginLineEnd)
  if (end === -1)
    throw new Error(`End marker not found: ${endMarker}`)
  return content.slice(0, beginLineEnd) + replacement + content.slice(end)
}

const targets = [
  {
    file: 'src/styles.css',
    begin: '/* BEGIN GENERATED THEMES',
    end: '/* END GENERATED THEMES */',
    generate: generateStylesRegion,
  },
  {
    file: 'public/init-mode.js',
    begin: '  // BEGIN GENERATED THEME COLORS',
    end: '  // END GENERATED THEME COLORS',
    generate: generateInitModeRegion,
  },
]

let failed = false
for (const { file, begin, end, generate } of targets) {
  const target = path.join(root, file)
  const current = await readFile(target, 'utf8')
  const next = replaceRegion(current, begin, end, generate())
  if (check) {
    if (next !== current) {
      console.error(`${file} is out of date. Run \`npm run generate:themes\`.`)
      failed = true
    }
    continue
  }
  if (next !== current) {
    await writeFile(target, next)
    console.log(`${file}: updated`)
  }
  else {
    console.log(`${file}: unchanged`)
  }
}
if (failed)
  process.exit(1)

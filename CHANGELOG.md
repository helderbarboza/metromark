# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-11-19

### Other

- Bump undici (#4)

Bumps  and [undici](https://github.com/nodejs/undici). These dependencies needed to be updated together.

Updates `undici` from 7.30.0 to 7.30.2
- [Release notes](https://github.com/nodejs/undici/releases)
- [Commits](https://github.com/nodejs/undici/compare/v7.30.0...v7.30.2)

Updates `undici` from 8.11.2 to 8.12.4
- [Release notes](https://github.com/nodejs/undici/releases)
- [Commits](https://github.com/nodejs/undici/compare/v7.30.0...v7.30.2)

---
updated-dependencies:
- dependency-name: undici
  dependency-version: 7.30.2
  dependency-type: indirect
- dependency-name: undici
  dependency-version: 8.12.4
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- Bump the github-actions group across 1 directory with 4 updates (#5)

Bumps the github-actions group with 4 updates in the / directory: [actions/checkout](https://github.com/actions/checkout), [actions/setup-node](https://github.com/actions/setup-node), [actions/upload-artifact](https://github.com/actions/upload-artifact) and [actions/download-artifact](https://github.com/actions/download-artifact).


Updates `actions/checkout` from 4 to 7
- [Release notes](https://github.com/actions/checkout/releases)
- [Changelog](https://github.com/actions/checkout/blob/main/CHANGELOG.md)
- [Commits](https://github.com/actions/checkout/compare/v4...v7)

Updates `actions/setup-node` from 4 to 7
- [Release notes](https://github.com/actions/setup-node/releases)
- [Commits](https://github.com/actions/setup-node/compare/v4...v7)

Updates `actions/upload-artifact` from 4 to 7
- [Release notes](https://github.com/actions/upload-artifact/releases)
- [Commits](https://github.com/actions/upload-artifact/compare/v4...v7)

Updates `actions/download-artifact` from 4 to 8
- [Release notes](https://github.com/actions/download-artifact/releases)
- [Commits](https://github.com/actions/download-artifact/compare/v4...v8)

---
updated-dependencies:
- dependency-name: actions/checkout
  dependency-version: '7'
  dependency-type: direct:production
  update-type: version-update:semver-major
  dependency-group: github-actions
- dependency-name: actions/download-artifact
  dependency-version: '8'
  dependency-type: direct:production
  update-type: version-update:semver-major
  dependency-group: github-actions
- dependency-name: actions/setup-node
  dependency-version: '7'
  dependency-type: direct:production
  update-type: version-update:semver-major
  dependency-group: github-actions
- dependency-name: actions/upload-artifact
  dependency-version: '7'
  dependency-type: direct:production
  update-type: version-update:semver-major
  dependency-group: github-actions
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- Bump svelte from 5.57.2 to 5.57.3 (#10)

Bumps [svelte](https://github.com/sveltejs/svelte/tree/HEAD/packages/svelte) from 5.57.2 to 5.57.3.
- [Release notes](https://github.com/sveltejs/svelte/releases)
- [Changelog](https://github.com/sveltejs/svelte/blob/main/packages/svelte/CHANGELOG.md)
- [Commits](https://github.com/sveltejs/svelte/commits/svelte@5.57.3/packages/svelte)

---
updated-dependencies:
- dependency-name: svelte
  dependency-version: 5.57.3
  dependency-type: direct:production
  update-type: version-update:semver-patch
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- Bump fast-uri from 3.1.8 to 3.1.9 (#11)

Bumps [fast-uri](https://github.com/fastify/fast-uri) from 3.1.8 to 3.1.9.
- [Release notes](https://github.com/fastify/fast-uri/releases)
- [Commits](https://github.com/fastify/fast-uri/compare/v3.1.8...v3.1.9)

---
updated-dependencies:
- dependency-name: fast-uri
  dependency-version: 3.1.9
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- Fix katex advisory and group coupled dependabot updates (#17)

* fix(deps): override katex to ^0.19.1

* chore: group coupled dnd-kit and snapgrid dependabot updates
- 0.6.0


### Refactoring

- Use language type guard

## [0.5.0] - 2026-11-18

### Bug Fixes

- Newly created folders accept drops


### Build & CI

- Strengthen dependency CI and add dependabot config (#3)


### Documentation

- V0.4.2 [skip ci]


### Features

- Add `de` locale
- Add `fr` locale


### Other

- Bump node-forge from 1.4.0 to 1.4.3 (#1)

Bumps [node-forge](https://github.com/digitalbazaar/forge) from 1.4.0 to 1.4.3.
- [Changelog](https://github.com/digitalbazaar/forge/blob/main/CHANGELOG.md)
- [Commits](https://github.com/digitalbazaar/forge/compare/v1.4.0...v1.4.3)

---
updated-dependencies:
- dependency-name: node-forge
  dependency-version: 1.4.3
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- Bump minimatch, eslint, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/utils and @typescript-eslint/typescript-estree (#2)

Bumps [minimatch](https://github.com/isaacs/minimatch) to 11.0.9 and updates ancestor dependencies [minimatch](https://github.com/isaacs/minimatch), [eslint](https://github.com/eslint/eslint), [@typescript-eslint/eslint-plugin](https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/eslint-plugin), [@typescript-eslint/parser](https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/parser), [@typescript-eslint/utils](https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/utils) and [@typescript-eslint/typescript-estree](https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/typescript-estree). These dependencies need to be updated together.


Updates `minimatch` from 10.2.6 to 11.0.9
- [Release notes](https://github.com/isaacs/minimatch/releases)
- [Changelog](https://github.com/isaacs/minimatch/blob/main/changelog.md)
- [Commits](https://github.com/isaacs/minimatch/compare/v10.2.6...v11.0.9)

Updates `eslint` from 10.12.0 to 10.15.0
- [Release notes](https://github.com/eslint/eslint/releases)
- [Commits](https://github.com/eslint/eslint/compare/v10.12.0...v10.15.0)

Updates `@typescript-eslint/eslint-plugin` from 8.71.2 to 8.73.0
- [Release notes](https://github.com/typescript-eslint/typescript-eslint/releases)
- [Changelog](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/CHANGELOG.md)
- [Commits](https://github.com/typescript-eslint/typescript-eslint/commits/v8.73.0/packages/eslint-plugin)

Updates `@typescript-eslint/parser` from 8.71.2 to 8.73.0
- [Release notes](https://github.com/typescript-eslint/typescript-eslint/releases)
- [Changelog](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/parser/CHANGELOG.md)
- [Commits](https://github.com/typescript-eslint/typescript-eslint/commits/v8.73.0/packages/parser)

Updates `@typescript-eslint/utils` from 8.71.2 to 8.73.0
- [Release notes](https://github.com/typescript-eslint/typescript-eslint/releases)
- [Changelog](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/utils/CHANGELOG.md)
- [Commits](https://github.com/typescript-eslint/typescript-eslint/commits/v8.73.0/packages/utils)

Updates `@typescript-eslint/typescript-estree` from 8.71.2 to 8.73.0
- [Release notes](https://github.com/typescript-eslint/typescript-eslint/releases)
- [Changelog](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/typescript-estree/CHANGELOG.md)
- [Commits](https://github.com/typescript-eslint/typescript-eslint/commits/v8.73.0/packages/typescript-estree)

---
updated-dependencies:
- dependency-name: minimatch
  dependency-version: 11.0.9
  dependency-type: indirect
- dependency-name: eslint
  dependency-version: 10.15.0
  dependency-type: direct:development
- dependency-name: "@typescript-eslint/eslint-plugin"
  dependency-version: 8.73.0
  dependency-type: indirect
- dependency-name: "@typescript-eslint/parser"
  dependency-version: 8.73.0
  dependency-type: indirect
- dependency-name: "@typescript-eslint/utils"
  dependency-version: 8.73.0
  dependency-type: indirect
- dependency-name: "@typescript-eslint/typescript-estree"
  dependency-version: 8.73.0
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- 0.5.0

## [0.4.2] - 2026-11-18

### Documentation

- V0.4.1 [skip ci]
- Update PRIVACY.md regarding youtube changes


### Other

- 0.4.2

## [0.4.1] - 2026-11-18

### Bug Fixes

- Pass Chrome Web Store flags in equals form to support multiline secrets


### Documentation

- V0.4.1 [skip ci]


### Other

- 0.4.1

## [0.4.0] - 2026-11-18

### Bug Fixes

- Fix eslint issues
- Fix swiss alps rendering
- Fix lint issue
- Fix slider drag getting stuck when disabled mid-gesture
- Sync lockfile with npm ci (add @emnapi/core and @emnapi/runtime 1.11.3)


### Features

- Add initial i18n
- Add pt translation
- Add es translation
- Add dock as a grid view mode
- Add i18n:watch script to the package.json
- Add scrollbar to the board
- Add "pause animated background"
- Add Sonner
- Add youtube backgrounds
- Add support to playlists
- Automate Chrome Web Store submission and changelog generation


### Other

- Improve grid-view registry
- Centralize settings defaults
- Copy and naming cleanup: board, folder, search placeholder
- Remove counters from RootsSelect
- Adjust RootsSelect style
- Debounce settings updates
- Live update shader when settings are updated
- Run eslint with cache
- Update icons
- Remove UndoToast component
- Resize background type select
- Position youtube video relative to the container
- Remove and replace IconButton component
- Remove bookmark/folder counters
- Setup knip; code cleanup
- Adjust search input styling
- Use empty-state components on BoardStatus
- 0.4.0

## [0.3.0] - 2026-11-16

### Bug Fixes

- Fix theme preview
- Satisfy lint (node/prefer-global/buffer, unicorn/prefer-includes, function-keyword and list-newline rules)


### Features

- Solid theme-color default background; seeded preview demo profiles

## [0.2.1] - 2026-11-16

### Features

- Rebrand the extension name and description

## [0.2.0] - 2026-11-16

### Bug Fixes

- Fix eslint issues
- Fix foreground color logic
- Fix eslint issues
- Fix issues
- Fix tests
- Fix selected and unselected tab triggers using the same colors
- Fix failing tests
- Fix wrong image reference on notice.md
- Fix eslint issues
- Tab a11y in the Settings dialog without making tabs identical


### Documentation

- Document atomic design hierarchy and component classification
- Retitle stories to atomic levels


### Features

- Add agents.md file
- Add stories for tile grids
- Add smooth scrolling
- Add eslint
- Add components
- Add stories
- Add themes and modes
- Add metro themes and update the remaining
- Add lint:fix to AGENTS.md
- Add shader and color backgrounds
- Add vscode settings
- Add incense shader
- Add clouds shader
- Add swiss alps shader, add renderScale and mouseInteraction settings
- Add black hole shader
- Add monterey shader
- Add slider component
- Add shader benchmarks
- Add animate-float and make non-dragging tiles float
- Add new themes, stop overriding --destructive color
- Add prism flow shader
- Add animations
- Add tooltips to the workspace footer buttons


### Other

- First commit
- Migrating to tailwind
- Icon styling
- Ignore .opencode
- Bump nodejs version
- Update lock
- Remove top nav bar
- Remove brand icons
- Remove tile decoration
- Update metro tile
- Update metro group
- Replace arrange mode with selection app bar
- Metro packing
- Format
- Name vars
- Switch to horizontalCompactor
- Align tiles on center
- Use 8 rows
- Remove paddings
- Themes
- Contrast
- Cleaning up
- Secure config
- MetroTile using tailwind
- Adjust color contrast threshold
- Swap titles and urls
- Format and lint
- Original favicons
- Use tailwind classes
- Steam icon
- Simplify icon conversion
- Less prop drilling on icons
- Icons
- Set tile color from favicon color
- Wip
- Simplify editor
- Componentize
- Use tailwind
- Use $lib alias
- Use data attributes for e2e
- Use tailwind
- Migrate to tailwind
- Use tailwind
- Tailwind canonical classes
- Image-rendering
- Label position on tiles
- Use default cursor
- Remove metro live faces
- Classes as props on favicon component
- Make tile icons responsive
- Adjusting favicon responsive size
- Domain style
- Anchor inside metrotile
- Stop shader restarting when tiles are moved
- Footer icons
- Prevent shader from going black when the window is resized
- RenderScale
- Auto framerate option
- .
- Settings as sidebar, fix eslint issues
- Replace old sliders with components
- Wip
- Wip
- Enable source maps
- Change favicon placeholders and add transition
- Remove transition from favicons
- Migrating things
- Migrating settings controls
- Make sliders responsive
- Image background
- Update image pickers
- Improve texts and icons on settings
- Components for dropdowns/context menus
- Remove light/dark labels
- Resize buttons over selected tiles
- Improve style on footer folder navigator
- Make items offscreen pause
- Update folder empty state, remove "add folder" button to the grid
- Remove unlicensed shaders, add license notices
- Update lock
- Show theme labels
- Update settings defaults
- Dedup code on tiles
- Rename metrotile component
- Replace arbitrary values on tailwind classes
- Block native context menu app-wide and disable text selection

Right-click still drives the app's own menus and tile selection.
Editable fields keep the native menu; dialogs and editable fields
keep text selection.
- Adjust tile style
- Use absolute imports
- Migrate reset tab to the new controls
- Move controls on settings
- Adjust padding on shell
- Use a select on roots


### Refactoring

- Split components into atoms, molecules and organisms
- Split FaviconIcon into presentational atom and cache container

[0.6.0]: https://github.com/helderbarboza/metromark/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/helderbarboza/metromark/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/helderbarboza/metromark/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/helderbarboza/metromark/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/helderbarboza/metromark/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/helderbarboza/metromark/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/helderbarboza/metromark/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/helderbarboza/metromark/releases/tag/v0.2.0


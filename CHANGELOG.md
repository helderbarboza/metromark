# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Bug Fixes

- Fix eslint issues
- Fix swiss alps rendering
- Fix lint issue
- Fix slider drag getting stuck when disabled mid-gesture


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

[0.3.0]: https://github.com/helderbarboza/metromark/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/helderbarboza/metromark/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/helderbarboza/metromark/releases/tag/v0.2.0


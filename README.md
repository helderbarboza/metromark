# MetroMark

[![CI](https://github.com/helderbarboza/metromark/actions/workflows/ci.yml/badge.svg)](https://github.com/helderbarboza/metromark/actions/workflows/ci.yml)

MetroMark replaces the browser new-tab page with a bookmark launcher and manager. It arranges the bookmarks that already exist in your browser as Metro-style tiles. The browser's bookmark database is the source of truth. Presentation metadata stays on the device. MetroMark ships as a browser extension for Chrome and Firefox (MV3).

## Highlights

- Metro-style tiles in four presets: small 1x1, medium 2x2, wide 4x2 and large 4x4.
- Tiles are arranged with drag and drop. Layout changes inside a folder do not reorder native bookmarks. Dragging a tile to another folder moves the bookmark in the browser.
- Search across bookmarks from the new-tab page.
- Undo for destructive actions. Whole subtrees are restored, created IDs are remapped, and missing destinations are recovered or reported.
- Folders stay visually flat. Subfolder headings show the full ancestry, including the browser container.
- Themes from [Tinted Theming](https://tinted-theming.github.io/tinted-gallery/) (base16 schemes), plus shader, image and YouTube backgrounds.
- Localized interface: English, German, French, Spanish and Portuguese.
- Accessible dialogs, menus and keyboard operation, with reduced-motion support.

## Tech stack

- [Svelte 5](https://svelte.dev/) (runes) and TypeScript
- [Vite](https://vite.dev/) for the isolated web preview
- [WXT](https://wxt.dev/) for the Chrome and Firefox MV3 builds from the same sources
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Snapgrid](https://github.com/snapgridjs/snapgrid) for tile arrangement
- [bits-ui](https://bits-ui.com/) / [shadcn-svelte](https://www.shadcn-svelte.com/) for UI primitives
- [typesafe-i18n](https://github.com/ivanhofer/typesafe-i18n) for localization
- [Vitest](https://vitest.dev/), [Storybook 10](https://storybook.js.org/) and [Playwright](https://playwright.dev/) for testing

## Architecture

MetroMark is local-first. There is no account, no backend and no telemetry. The new-tab page reads and changes the browser's own bookmarks through the extension APIs.

```text
new-tab page (Svelte UI)          background coordinator (MV3)
        |                                    |
        └──────── extension messaging ───────┘
                          |
              adapters (native / preview)
                          |
           browser bookmarks + storage APIs
```

- `src/lib/coordinator.ts` serializes all bookmark commands and persists presentation metadata. Keep bookmark mutations behind the coordinator.
- `src/lib/tree.ts` projects the native bookmark tree into tiles and applies protection rules.
- `src/lib/adapters/native.ts` talks to the browser APIs. `src/lib/adapters/preview.ts` provides isolated demo persistence for the web preview.
- The web preview (`npm run dev`) uses sample data. It has no access to native bookmarks and is not the installed extension.

See [docs/atomic-design.md](docs/atomic-design.md) for the component hierarchy.

## Getting started (development)

Prerequisite: Node.js 26 or newer (see `.nvmrc` and `package.json`).

```sh
npm ci                # install dependencies (also runs `wxt prepare`)
npm run dev           # web preview on 0.0.0.0:5173 with sample data
npm run dev:chrome    # Chrome extension in development mode
npm run dev:firefox   # Firefox extension in development mode (MV3)
npm run storybook     # Storybook on 0.0.0.0:6006
```

Build the extension packages:

```sh
npm run build         # Chrome + Firefox MV3 builds (.output/)
npm run build:chrome  # Chrome MV3 only
npm run build:firefox # Firefox MV3 only
npm run build:preview # static preview build (dist/preview)
npm run package       # package the existing .output builds (run build first)
```

The preview and the installed extension are different things. The preview is a demo with sample data. The extension reads and manages real bookmarks in the browser profile where it is installed.

Signed store releases are produced by the release workflow from version tags. Unsigned builds attached to [GitHub Releases](https://github.com/helderbarboza/metromark/releases) are developer-loadable. Permanent Firefox installation needs Mozilla signing.

## Project structure

```text
src/
  entrypoints/        new-tab page and background coordinator
  lib/
    coordinator.ts    serialized commands, reconciliation, Undo
    tree.ts           bookmark projection, ancestry, protection rules
    layout-constants.ts
    adapters/         native browser APIs and isolated preview persistence
    components/       atoms, molecules, organisms and ui/ (shadcn-svelte)
    shaders/          background shader registry
  i18n/               en (base), de, fr, es, pt
tests/                unit tests (Vitest, node environment)
e2e/                  Playwright preview interaction tests
docs/                 architecture decision records and design docs
scripts/              build, packaging, theme generation and verification
```

## Testing

```sh
npm test              # unit tests (Vitest unit project)
npm run test:stories  # Storybook component tests in a browser (needs Playwright Chromium)
npm run test:e2e      # Playwright interactions against the preview on port 5173
```

`npm test` does not run the Storybook or e2e suites. Install the browser once with `npx playwright install chromium`.

## Development workflow

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/). A local `commit-msg` hook enforces the format with commitlint.
- Edit `src/i18n/en/index.ts` only, then run `npm run i18n` to regenerate the i18n runtime.
- Edit `src/lib/themes.ts` only, then run `npm run generate:themes` to regenerate the theme regions in `src/styles.css` and `public/init-mode.js`.
- `CHANGELOG.md` is generated with git-cliff (`npm run changelog`). Do not edit it by hand.
- The release workflow runs on `v*` tag pushes. It runs the checks, builds and packages the extensions, verifies the checksums, creates the GitHub Release and submits the Chrome build to the Chrome Web Store as a staged publish. The publish goes live only after a manual publish in the Developer Dashboard. Firefox signing and the store listing are manual steps.

## Coding standards

- [AGENTS.md](AGENTS.md) is the source of the project rules (product invariants, browser behavior, security, accessibility).
- [docs/atomic-design.md](docs/atomic-design.md) states the component hierarchy and the presentational boundary.
- ESLint is the only linter. There is no Prettier.
- Prefer the shadcn-svelte primitives in `src/lib/components/ui` over hand-rolled dialogs, menus and inputs.
- Keep browser API details in adapters. Keep presentation logic out of the coordinator.

## Privacy and notices

- [PRIVACY.md](PRIVACY.md) describes what MetroMark reads, stores and sends. There is no telemetry and no account. Presentation data stays on the device.
- [NOTICE.md](NOTICE.md) lists acknowledgments and licensing of supplied material.
- Third-party license texts ship as `public/licenses/third-party.txt` and are copied into both extension builds.

## Contributing

1. Read [AGENTS.md](AGENTS.md).
2. Make the change behind the coordinator boundary where it touches bookmarks.
3. Run `npm run check`, `npm run lint` and `npm test` before opening a pull request.
4. Use a Conventional Commit message.

## License

This repository does not declare a license. See [NOTICE.md](NOTICE.md) for acknowledgments and third-party terms.

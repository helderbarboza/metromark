# MetroMark agent instructions

Scope: this repo and subdirectories. Make only requested changes. Do not run tests, builds, packaging, or services for docs-only tasks. Respect explicit skip-tests requests.

## Project

Chrome/Firefox MV3 extension that replaces the new tab with a MetroMark bookmark launcher/manager. Browser bookmarks are the source of truth. The web preview (`npm run dev`) uses isolated sample data, not real bookmarks. Node.js 24 or newer (`.nvmrc`, `engines.node`).

## Stack

- Svelte 5 runes + TypeScript; Tailwind CSS 4 via Vite.
- ESLint only; no Prettier.
- WXT for Chrome and Firefox MV3 builds. Auto-imports are disabled (`imports: false` in `wxt.config.ts`). Import browser APIs explicitly from `wxt/browser`; do not rely on auto-import globals.
- Snapgrid for tile arrangement.
- Storybook 10 with native Svelte CSF stories.
- `$lib` alias points to `src/lib`.

## Commands

```sh
npm ci                   # also runs `wxt prepare` (postinstall); `.wxt/` is gitignored
npm run dev              # isolated preview, 0.0.0.0:5173
npm run dev:chrome       # WXT Chrome development
npm run dev:firefox      # Firefox development; always pass --mv3
npm run storybook        # Storybook, 0.0.0.0:6006
npm run build-storybook  # static component docs
npm run build            # Chrome + Firefox MV3 builds
npm run build:chrome
npm run build:firefox
npm run build:preview    # Vite build -> dist/preview
npm run package          # package existing .output builds; run build first
npm run check            # svelte-check
npm run lint             # ESLint
npm run lint:fix         # ESLint auto-fix
npm test                 # Vitest unit project (node env) only
npm run test:stories     # Vitest Storybook project (browser)
npm run test:e2e         # Playwright preview interactions
node scripts/test-firefox.mjs  # disposable Firefox profile; requires Firefox build; downloads geckodriver (network)
```

Run one unit test with `npx vitest run --project unit tests/<file>.test.ts`. Append a path to `npm run test:stories` for one story file.

Testing quirks:

- `npm test` runs only the `unit` project. It does not run Storybook or e2e checks.
- `npm run test:stories` runs Storybook 10 in browser mode (chromium, `--no-sandbox`). It starts Storybook itself and needs Playwright browsers installed (`npx playwright install chromium`).
- `npm run test:e2e` auto-starts the vite preview on port 5173 (or reuses a running one) and targets `http://127.0.0.1:5173`.
- Vitest runs serially (`maxWorkers: 1`, `fileParallelism: false`).
- There is no CI. Run `npm run check`, `npm run lint` and `npm test` yourself and report only the checks that actually passed.

## Architecture

- `src/App.svelte`: workspace state, menus/dialogs, search, navigation, drag-layout batching.
- `src/lib/coordinator.ts`: serialized commands, native-event reconciliation, persistence, durable Undo.
- `src/lib/tree.ts`: bookmark projection, ancestry, protection rules, tile presentation, URL validation.
- `src/lib/layout.ts`: re-export shim only. Implementation is `src/lib/layout-constants.ts` (tile sizes, packing, validation, layout reconciliation). Import from `$lib/layout` or `$lib/layout-constants` as the surrounding code does.
- shadcn-svelte is configured (`components.json`). UI primitives are in `src/lib/components/ui`. Prefer them over hand-rolled dialogs, menus and inputs.
- `src/lib/adapters/native.ts`: native bookmark/storage APIs and privileged background messaging.
- `src/lib/adapters/preview.ts`: isolated demo persistence and cross-tab updates.
- `src/lib/components/`: adapted Metro UI and management components.
- `src/lib/shaders/`: background shader registry and implementations.
- `src/entrypoints/`: new-tab override and background coordinator.
- `.storybook/` and `src/lib/stories/`: component docs, fixtures, interactions, accessibility config.
- `tests/`: unit tests (`vitest` unit project).
- `e2e/`: Playwright preview interaction tests.
- `scripts/test-firefox.mjs`: native Firefox verification in a disposable profile.
- `scripts/package.mjs`: browser archives, source archive, bundle, checksums.

Put bookmark mutations behind coordinator commands. Keep browser API details in adapters and presentation logic out of the coordinator. Identify bookmarks and folders by browser IDs, not titles or assumed fixed root IDs. WXT uses `srcDir: src`; the Tailwind ESLint entry point is `src/styles.css`.

## Theming

- Themes come verbatim from Tinted Theming (<https://tinted-theming.github.io/tinted-gallery/>). Use `base16` schemes only. Do not adjust hex values.
- Single source of truth: `src/lib/themes.ts` holds every theme's palette and label. Everything else derives from it. Do not hand-sync theme lists or values anywhere else.
- `src/styles.css` and `public/init-mode.js` contain GENERATED regions between `BEGIN/END GENERATED THEMES` markers. Run `npm run generate:themes` after editing `src/lib/themes.ts`. Use `npm run generate:themes -- --check` to verify the regions are in sync. Commit the generated output; the generator is the only writer of those regions.
- `LIGHT_THEMES`/`DARK_THEMES`, the `ThemeName`/`LightTheme`/`DarkTheme`/`ThemeChoice` types (`src/lib/themes.ts`, re-exported by `src/lib/theme-picker.ts`) and the Storybook backgrounds derive from `THEMES` at import time.
- Defaults: catppuccin-latte (light), catppuccin-mocha (dark) — change only the `DEFAULT_*` constants in `src/lib/themes.ts`, never the consumers. The set itself lives in `src/lib/themes.ts`; do not duplicate the list here.
- Light blocks use `:root[data-theme='x'], .theme-preview[data-theme='x']`. Dark blocks use `.dark[data-theme='x'], .theme-preview.dark[data-theme='x']`.
- Each block sets `--background`=base00, `--card`=base01, `--accent`=base02, `--border`=base02, `--foreground`=base05, `--muted-foreground`=base05 blended toward base00 until contrast against base00 is ≥ 4.5:1 (derived by the generator; gallery base04 is dimmer than 4.5:1 in 7 of the 12 themes), `--primary`=base0D, `--primary-foreground`=base00, plus `--base00` through `--base0F` verbatim. `--destructive` (`#dc2626`) and `--destructive-foreground` (`#ffffff`) are fixed constants defined once in the shared `:root[data-theme]` derivation block; they are not derived from any palette, and the generator must not emit them. Popover, secondary, muted, ring, charts and sidebar stay in the shared `:root[data-theme]` derivation block; do not duplicate them per theme. The generator owns the block template and the derivation; change them there.
- `--base00…--base0F` drive tile accent swatches, charts and theme previews. Do not hand-pick them.
- To add a theme: add one entry to `THEMES` in `src/lib/themes.ts`, run `npm run generate:themes`, check with `npm run generate:themes -- --check`. Optionally reference the theme in a story. The name is the gallery slug without the `base16-` prefix (for example `base16-tokyo-night-moon` becomes `tokyo-night-moon`).
- To remove or rename a theme: remove or rename the same single entry, regenerate. Do not write migration code; `isOneOf` in `theme-picker.ts` falls back to the defaults for stale saved selections.
- `public/init-mode.js` cannot import modules. The generator fills its `THEME_COLORS` region; keep the hand-written pre-paint logic intact.
- Keep the static `theme-color` meta in `index.html` and `src/entrypoints/newtab/index.html` synced to the light default base00 when you change the light default.
- Theme edits do not update `release/` artifacts. Regenerate them with `npm run build` + `npm run package` when a themed release is needed.
- Metro/Fluent theme palettes do not exist anymore; the Metro design language stays, but palettes are gallery `base16` only.
- Verify theme changes with `npm run check`, `npm run lint`, `npm test`, and `npm run test:e2e` (the contrast test covers mode/theme switching).

## Product invariants

1. Browser containers such as Bookmarks Bar/Toolbar, Other Bookmarks, and Bookmarks Menu stay separate named groups.
2. Folder groups are visually flat. Subfolder headings show full ancestry, including the browser container. No nested tile panels.
3. Tile presets: small 1x1, medium 2x2, wide 4x2, large 4x4.
4. Within-folder dragging changes local layout metadata only. It must not reorder native bookmark siblings.
5. Cross-group pointer dragging moves the actual bookmark into the destination folder. The Move to folder dialog is the keyboard alternative.
6. Native bookmark manager changes update open new-tab pages; MetroMark management changes update native bookmarks.
7. Tile right-clicks select the tile and open its app bar commands. Group and canvas right-clicks open real context menus. Group controls manage folders.
8. Destructive actions offer Undo. Preserve whole-subtree restoration, recreated-ID remapping, missing-destination recovery, and conflict guards.
9. Protect managed bookmarks and browser-owned containers. Not every folder is writable or removable.
10. The new-tab page is the manager. Do not add a separate manager view or alter the native bookmark manager UI without authorization.

## Browser behavior and persistence

- Keep Chrome MV3 service worker and Firefox MV3 event-page background configuration browser-specific.
- Register background listeners synchronously before asynchronous initialization.
- Keep Firefox builds explicitly MV3; WXT's default Firefox target may differ.
- Feature-detect optional bookmark events and platform-specific fields.
- Coalesce source/destination layout callbacks into one cross-group operation. Source removal during dragging is not bookmark deletion.
- Preserve local placement when native titles, URLs, or sibling order change.
- Keep restart-critical Undo state in extension storage, not only process memory.
- Undo expires after 30 seconds. Expiry is not a secure-erasure guarantee.
- Native bookmark sync belongs to the browser. Presentation metadata is local, not a hosted sync service.

## Security and privacy

- Request only `bookmarks` and `storage` permissions, plus Chrome-only `favicon`. No scope change without approval.
- No telemetry, accounts, remote favicon services, external font requests, or host permissions.
- Treat bookmark titles and URLs as untrusted data. Never interpolate them into raw HTML, SVG, or executable code.
- Raw SVG rendering is limited to the trusted bundled registry. Keep ESLint exemptions narrowly scoped.
- Preserve unsupported/unsafe URLs in the native tree, but validate before launch. Do not launch executable, data, or blob URLs.
- Do not overwrite conflicting external edits during Undo or restore into a protected/missing destination without recovery handling.
- Use disposable browser profiles for verification. Never automate or modify the user's personal profile.
- Do not sign, upload, or publish extensions without explicit authorization.

## UI and accessibility

- Use Svelte runes for reactive state. Clean up subscriptions, listeners, timers, and animation callbacks.
- Use Tailwind utilities for new or changed styles. Do not add a CSS rule or `<style>` block when a utility can express the style. Use theme tokens and arbitrary values such as `border-(--line)`, `text-(--muted)`, `pt-[22px]`. Keep existing CSS only when a utility cannot express the requirement; state the reason in a comment.
- Preserve keyboard operation, visible focus, dialog focus handling, menu navigation, and drag cancellation.
- Accessible names must include visible labels, including displayed domain text where applicable.
- Give form controls clear labels; connect hints with `aria-describedby`, not control names.
- Keep tile text readable on custom colors and preserve reduced-motion behavior.
- Dialog submission must not keep reading mutable dialog state after a successful command closes the dialog.
- Do not remove accessibility checks just to make a story pass.

## Delivery

- Build before packaging when code changes require updated browser artifacts.
- Release artifacts are gitignored scratch output. Do not commit them and never hand-edit them. Persistent deliverables are the GitHub Release assets (or the workflow artifacts) produced by the release workflow; do not rely on `release/` surviving snapshots either.
- The release workflow (`.github/workflows/release.yml`) is triggered by manual dispatch only. It runs the gate, builds, packages, verifies the checksums and attaches the bundles to the GitHub Release for the version tag. Use `npm run build` + `npm run package` to produce the same artifacts locally for verification.
- Include editable source, installation instructions, privacy information, and dependency notices in releases.
- Chrome loads through Load unpacked. Firefox unsigned XPI is temporary installation; permanent standard Firefox needs Mozilla signing.
- Clearly distinguish the demo preview from the installed native extension.
- Report only checks actually completed. A successful build does not imply a passing test suite or store approval.

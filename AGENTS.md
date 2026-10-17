# Agent instructions

## Scope

These instructions apply to the Metro Bookmarks project and its subdirectories. Make only changes needed for the current user request. Do not regenerate release packages, install dependencies, run checks, or start services when the task only asks for documentation. Respect explicit requests to skip tests.

## Project

Metro Bookmarks is a Chrome/Firefox extension that replaces the new-tab page with a Metro-inspired bookmark launcher and manager. The browser's bookmark database is the source of truth. The standalone web preview uses isolated sample data, not real bookmarks.

### Required stack

- Svelte 5 with runes and TypeScript.
- Tailwind CSS 4 through its Vite integration.
- ESLint; **do not introduce or run Prettier**.
- WXT for Chrome and Firefox Manifest V3 builds.
- Snapgrid for tile arrangement.
- Storybook with native Svelte CSF stories. Consult current official documentation before changing Storybook APIs or configuration.
- Node.js 24 or newer; respect `.nvmrc`, `package.json`, and the lockfile.

Reuse and adapt the supplied Metro components rather than replacing them with an unrelated component system.

## Product invariants

1. Browser containers such as Bookmarks Bar/Toolbar, Other Bookmarks, and Bookmarks Menu remain separate named groups.
2. Folder groups are visually flat. Subfolder headings show their full ancestry, including the browser container; do not introduce nested tile panels.
3. Tile presets are small (1×1), medium (2×2), wide (4×2), and large (4×4).
4. Within-folder dragging changes local layout metadata only. It must not reorder native bookmark siblings.
5. Cross-group pointer dragging moves the actual bookmark into the destination folder. The Move to folder dialog provides a keyboard-accessible alternative.
6. Changes from the native bookmark manager update open new-tab pages, and Metro's management changes update native bookmarks.
7. Tile right-clicks select the tile and open its app bar of commands; group and canvas right-clicks open actual context menus. Group controls provide folder management.
8. Destructive actions offer Undo. Preserve whole-subtree restoration, recreated-ID remapping, missing-destination recovery, and conflict guards.
9. Protect managed bookmarks and browser-owned containers. Do not assume every folder is writable or removable.
10. The new-tab page is the manager. Do not add a separate manager view or alter the native bookmark-manager UI without authorization.

## Architecture

- `src/App.svelte`: workspace state, menus/dialogs, search, navigation, and drag-layout batching.
- `src/lib/coordinator.ts`: serialized commands, native-event reconciliation, persistence, and durable Undo.
- `src/lib/tree.ts`: bookmark projection, ancestry, protection rules, tile presentation, and URL validation.
- `src/lib/layout.ts`: tile sizes, packing, validation, and independent layout reconciliation.
- `src/lib/adapters/native.ts`: native bookmark/storage APIs and privileged background messaging.
- `src/lib/adapters/preview.ts`: isolated demo persistence and cross-tab updates.
- `src/lib/components/`: adapted Metro UI and management components.
- `src/entrypoints/`: background and privileged new-tab entrypoints.
- `.storybook/` and `src/lib/stories/`: component documentation, fixtures, interactions, and accessibility configuration.
- `tests/`: domain and coordinator unit tests.
- `e2e/`: Playwright preview interaction tests.
- `scripts/test-firefox.mjs`: native Firefox verification using a disposable profile.
- `scripts/package.mjs`: browser archives, source archive, bundle, and checksums.

Put bookmark mutations behind coordinator commands. Keep browser API details in adapters and presentation logic out of the coordinator. Identify bookmarks and folders by browser IDs, not titles or assumed fixed root IDs.

## Browser behavior and persistence

- Keep Chrome's MV3 service worker and Firefox's MV3 event-page background configuration browser-specific.
- Register background listeners synchronously, before asynchronous initialization.
- Keep Firefox builds explicitly MV3; WXT's default Firefox target may differ.
- Feature-detect optional bookmark events and platform-specific fields.
- Coalesce source/destination layout callbacks into a single cross-group operation. Source removal during dragging is not bookmark deletion.
- Preserve local placement when native bookmark titles, URLs, or sibling order change.
- Keep restart-critical Undo state in extension storage, not only process memory.
- Undo currently expires after 30 seconds. Expiry is not a secure-erasure guarantee; do not describe it as one.
- Native bookmark synchronization belongs to the browser. Presentation metadata is local, not a hosted sync service.

## Security and privacy

- Request only `bookmarks` and `storage` permissions unless the user approves a scope change.
- Do not add telemetry, accounts, remote favicon services, external font requests, or host permissions.
- Treat bookmark titles and URLs as untrusted data. Never interpolate them into raw HTML, SVG, or executable code.
- Raw SVG rendering is limited to the trusted bundled registry. Keep any required ESLint exemptions narrowly scoped.
- Preserve unsupported/unsafe URLs in the native tree, but validate before launching. Do not launch executable, data, or blob URLs.
- Do not overwrite conflicting external edits during Undo or restore into a protected/missing destination without recovery handling.
- Use disposable browser profiles for verification. Never automate or modify the user's personal profile.
- Do not sign, upload, or publish extensions without explicit authorization.

## UI and accessibility

- Use Svelte runes for reactive state and clean up subscriptions, listeners, timers, and animation callbacks.
- Preserve keyboard operation, visible focus, dialog focus handling, menu navigation, and drag cancellation.
- Accessible names must include visible labels, including displayed domain text where applicable.
- Give form controls clear labels; connect explanatory hints with `aria-describedby` rather than folding hints into control names.
- Keep tile text readable on custom colors and preserve reduced-motion behavior.
- Dialog submission must not continue reading mutable dialog state after a successful command closes the dialog.
- Do not remove accessibility checks merely to make a story pass.

## Commands

Run only the commands appropriate to the current request. In particular, do not run tests when the user asks to skip them.

```sh
npm ci                    # Install locked dependencies; runs WXT preparation
npm run dev               # Isolated web demo, port 5173
npm run dev:chrome        # Chrome extension development
npm run dev:firefox       # Firefox MV3 development
npm run storybook         # Storybook development, port 6006
npm run build-storybook   # Static component documentation
npm run build             # Chrome and Firefox MV3 production builds
npm run package           # Package existing production builds into release/

npm run check             # Svelte/TypeScript diagnostics
npm run lint              # ESLint
npm test                  # Domain/coordinator unit tests
npm run test:stories       # Storybook browser/accessibility cases
npm run test:e2e           # Playwright preview interactions
```

Browser checks require their browser binaries and OS dependencies. Do not force dependency resolution or perform broad upgrades as an incidental fix. Explain compatibility changes and preserve a reproducible lockfile.

For a hosted workspace preview, bind the server to `0.0.0.0` and allow its preview host. Browser-facing code must not use sandbox `localhost` URLs to reach a separate service; prefer relative URLs.

## Delivery

- Build before packaging when code changes require updated browser artifacts.
- Keep persistent deliverables in `release/`; do not rely on generated `.output/`, `dist/`, caches, or `node_modules/` surviving workspace snapshots.
- Include the editable source, installation instructions, privacy information, and required dependency notices in releases.
- Chrome is developer-loaded through Load unpacked. Firefox's unsigned XPI is for temporary installation; permanent standard-Firefox installation requires Mozilla signing.
- Clearly distinguish the demo preview from the installed native extension.
- Report only checks actually completed. A successful build does not imply a passing test suite or store approval.

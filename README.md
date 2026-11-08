# Metro Bookmarks

A Metro-inspired new-tab launcher and bookmark manager for Chrome and Firefox. Built with **Svelte 5 runes, TypeScript, Tailwind CSS 4, ESLint, WXT, Snapgrid, and Storybook 10**. Prettier is not configured or used.

## Deliverables

Download [the complete bundle](release/metro-bookmarks-0.1.0-bundle.zip), or use the separate packages:

- [Chrome ZIP](release/metro-bookmarks-chrome-0.1.0.zip)
- [Firefox unsigned XPI](release/metro-bookmarks-firefox-0.1.0-unsigned.xpi)
- [Firefox ZIP](release/metro-bookmarks-firefox-0.1.0.zip)
- [Editable source ZIP](release/metro-bookmarks-source-0.1.0.zip)
- [Installation guide](docs/INSTALL.md)

These are **development builds**, not store-published extensions. Firefox's unsigned build is for temporary installation. Manifest minimum versions are Chrome 128 and Firefox 140.

The live web preview is an isolated **demo workspace**; it cannot access your real bookmarks. Installed extension builds use the actual browser bookmark APIs.

## What it does

- Keeps all browser bookmark containers separate, with their own named groups.
- Presents every folder as a flat group. A subfolder header displays its full ancestry, including its browser container.
- Provides small, medium, wide and large tiles: 1×1, 2×2, 4×2 and 4×4 grid cells.
- Receives native bookmark changes in open new tabs and writes management changes back to the actual browser tree.
- Selecting a tile (right-click, the menu key or Shift+F10) opens an app bar with its edit, move, delete and size commands; group and background right-clicks open context menus. Creation, editing, folder management, moving, customization and deletion are available directly on the new-tab page.
- Offers **30-second Undo** for deletion, moves, bookmark edits and layout resets. Folder deletion backs up the entire subtree and remaps recreated bookmark IDs on restoration.
- Provides a confirmed factory reset for Metro appearance, settings and theme. It keeps all browser bookmarks.
- Stores appearance and tile placement separately from the browser's bookmarks.
- Includes title/URL/path search, browser-container filtering, horizontal group navigation, four themes, two densities and reduced-motion settings.
- Offers a solid color background, an animated shader background, or an image background. Image backgrounds accept a remote http(s) URL or an image you upload (stored in your browser's IndexedDB on this device; PNG, JPEG, WebP, GIF or SVG, up to 25 MB), with cover/contain/fill/none fit, an opacity slider and an adjustable parallax zoom (1–4×).

### Arrangement rules

Tiles are always movable; no mode has to be turned on first. Within-folder movement changes only local presentation metadata; it does **not** reorder native bookmark siblings. Cross-group pointer dragging moves the real bookmark into the destination folder. On a touch screen a short drag down on a tile reveals the selection check: releasing there selects the tile, while continuing past the drag threshold picks it up to move. Tiles claim the touch gesture, so pan the canvas by dragging its empty background rather than a tile. Keyboard dragging works within a group: Space picks up/drops, arrow keys move, and Escape cancels. Use the Move to folder dialog for keyboard-accessible cross-folder moves.

Managed bookmarks and browser-owned containers are protected. Writable browser containers can receive bookmarks but cannot be renamed or deleted through Metro. Firefox separators are not shown as tiles and are preserved when restoring a deleted subtree.

### Shortcuts

- `/` or Ctrl/Cmd+K: focus search when not typing in another field.
- Ctrl/Cmd+Z: undo the most recent eligible operation when not typing.
- Escape: close a dialog/menu, clear the search or the tile selection; during a drag it cancels the gesture instead.

## Development

Use **Node.js 24 or newer**.

```sh
npm ci
npm run dev               # Isolated demo, port 5173
npm run dev:chrome        # WXT extension development
npm run dev:firefox       # Firefox MV3 development
npm run storybook         # Storybook, port 6006
npm run build-storybook   # Static component documentation
npm run build             # Chrome and Firefox MV3 builds
npm run package           # Persistent release packages and editable source
```

`npm run package` packages the existing `.output/chrome-mv3` and `.output/firefox-mv3` builds; run `npm run build` first. Extension builds do not require a web server or an internet connection to render. Fonts and icons are bundled locally.

Available optional verification commands are `npm run check`, `npm run lint`, `npm test`, `npm run test:stories` and `npm run test:e2e`. Browser tooling needs Playwright browsers installed. `scripts/test-firefox.mjs` exercises the Firefox extension in a disposable profile after a Firefox build. No command uses your personal browser profile.

Work completed before delivery included native Chrome and Firefox smoke checks, 37 domain/coordinator unit tests, 24 Storybook browser/accessibility cases, and targeted preview interaction checks. **Further testing was stopped at the user's request; no final full-suite run is claimed for the packaged build.**

## Architecture

- `src/lib/coordinator.ts`: serialized bookmark commands, native-event reconciliation and a durable Undo journal.
- `src/lib/adapters/native.ts`: browser bookmarks/storage and privileged background messaging.
- `src/lib/adapters/preview.ts`: isolated local demo and cross-tab updates.
- `src/lib/tree.ts` / `layout.ts`: flat folder projection, protection rules and independent layout reconciliation.
- `src/lib/components`: adapted supplied Metro components, safe glyphs and management UI.
- `.storybook` / `src/lib/stories`: native Svelte CSF stories, documentation, interactions and accessibility configuration.
- `src/entrypoints`: new-tab override and background coordinator. Chrome uses an MV3 service worker; Firefox uses an MV3 event page.

## Privacy, limitations and release notes

Only `bookmarks` and `storage` permissions are requested, plus the Chrome-only `favicon` permission for tile icons (local favicon cache only). There are no host permissions, accounts, analytics, remote favicon requests or external font requests. See [PRIVACY.md](PRIVACY.md).

Presentation metadata is local to the extension/profile and is not synced through `storage.sync`. Native bookmark syncing remains controlled by the browser. Removing the extension does not undo edits made to real bookmarks; it may remove local appearance and Undo metadata. Undo expires after 30 seconds and refuses to overwrite conflicting external edits. Back up important bookmarks before testing management operations.

Unsafe executable/data/blob bookmark URLs remain in the browser tree but are not launched by Metro. Private/incognito new-tab overrides are browser-restricted and are not promised by this build.

The browser-development toolchain has known transitive high-severity advisories involving Android/ADB tooling; those tools are not shipped in the extension bundles. The previously run production-dependency audit reported no vulnerabilities. A patched `shell-quote` override removes the critical development-tool advisory identified during implementation. Do not expose extension-development tooling as a public service.

Source and dependency acknowledgments are in [NOTICE.md](NOTICE.md); bundled dependency license texts are in `public/licenses/third-party.txt` and included in both browser builds.

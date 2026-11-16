# Install MetroMark

**These are development builds, not store-published extensions.** Back up important bookmarks before trying management actions. Simply loading the extension reads your bookmarks; editing, moving or deleting in MetroMark changes the real browser tree.

## Chrome

1. Extract `metromark-0.3.0-bundle.zip` and locate `chrome-mv3/`. Alternatively, extract the separate Chrome ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the directory containing `manifest.json`.
5. Open a new tab. MetroMark should show your bookmark counters and your real bookmarks.

Keep the unpacked folder in a stable location. Other new-tab extensions may compete with this override; disable them if necessary. Minimum manifest version target: Chrome 128.

## Firefox — temporary installation

1. Extract the complete bundle, or download `metromark-firefox-0.3.0-unsigned.xpi`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select the unsigned XPI, or `firefox-mv3/manifest.json` from the extracted bundle.
5. Open a new tab. If Firefox asks whether to keep the new-tab change, keep it.

A temporary Firefox add-on is removed when the browser restarts. A permanent installation in standard Firefox requires Mozilla signing; **this XPI is not signed**. Minimum manifest version target: Firefox 140.

## Using MetroMark

- Click a tile to launch its bookmark.
- Right-click a tile, or press the menu key or Shift+F10 on it, to select it and open the app bar with edit/move/delete and size presets.
- Right-click the canvas to add bookmarks or folders and open settings.
- Use a group's three-dot button for folder actions.
- Tiles are always draggable. Same-group dragging changes only the tile layout; dragging to another group moves the real bookmark.
- On a touch screen, drag a tile down to reveal the check; releasing there selects the tile, while continuing past the drag threshold picks it up to move. Tiles claim the touch, so pan the canvas by dragging its empty background.
- Keyboard dragging: Space picks a focused tile up, arrow keys move it, Space/Enter drops it, Escape cancels. Enter opens the bookmark. For cross-folder keyboard moves, use **Move to folder**.
- Destructive actions offer **Undo for 30 seconds**. Folder deletion restores its whole subtree when undone.
- Native bookmark-manager edits appear in open new-tab pages, and MetroMark's management actions update native bookmarks.

Browser-owned containers remain separate. Subfolders are flat groups with their ancestry shown in the heading, rather than nested tile panels.

## Demo versus extension

The live web preview uses 24 sample bookmarks in isolated local storage. It does **not** read or modify your real browser bookmarks. Install one of the extension builds to use your actual bookmarks.

## Uninstalling

Removing or disabling MetroMark restores the browser's normal new-tab behavior. It does not undo real bookmark edits you made in MetroMark. Local layout, appearance and Undo data may be removed when the extension is uninstalled.

## Source

The bundle includes `metromark-source-0.3.0.zip`. Extract it, install Node.js 24+, and run `npm ci`. The source includes Svelte 5 runes, TypeScript, ESLint, Tailwind, Snapgrid and Storybook; Prettier is not used.

Further test runs were stopped on request. The source README records the checks completed earlier; no final complete verification run is claimed.

# Atomic design

This document states the component hierarchy for MetroMark. Follow these rules for new components and for moves of existing components.

## Levels

1. Atoms. One visual element, one responsibility. Import no markup from other components.
2. Molecules. A small group of atoms that works as one unit. One interaction pattern per molecule.
3. Organisms. A distinct feature area of the interface. One feature area per organism.
4. Templates. A page-level layout that arranges organisms. Slots only, no data.

Never skip a level. Classify a component by what it is, not by its file name. A component that composes other components is not an atom.

## Directory map

```text
src/lib/components/
  ui/          Registry-managed shadcn-svelte primitives. Atom layer. Do not move.
  atoms/       Icons and favicon rendering.
  molecules/   Small composed units.
  organisms/   Feature areas. Dialogs and settings live in organisms/editor/.
  templates/   Reserved. No templates exist yet.
  *.ts         Shared helpers used by more than one level (tile-variants, tile-props, tilt).
```

Stories stay in `src/lib/stories/`. Story `title` matches the level directory, for example `Atoms/Icon`, `Molecules/Settings row`, `Organisms/Metro group`.

## Rules

- Components render UI. They take data through props and emit events through callbacks.
- Data fetching, persistence and command dispatch live outside components, in adapters, the coordinator, or container components.
- Visual properties use theme tokens. Do not hard-code color, spacing, radius or font-size values.
- Compose components. Do not add boolean flag props to switch a component into a different kind of thing.
- Keep atoms under 50 lines and molecules under 100 lines. Split only at a real seam, never just to meet a number.
- A component earns a place in the hierarchy only when it renders UI. Headless helpers stay outside the levels.

## Classification

### Atoms

| Component | Notes |
| --- | --- |
| `ui/**` | shadcn-svelte primitives. Managed by the registry. Aliases live in `components.json`. |
| `atoms/Icon.svelte` | Inline icon from the bundled registry. |
| `atoms/FaviconIcon.svelte` | Presentational. Receives the resolved favicon state as props. |

### Molecules

| Component | Notes |
| --- | --- |
| `molecules/IconButton.svelte` | Button + icon. |
| `molecules/TileShell.svelte` | Shared tile shell. |
| `molecules/Modal.svelte` | Dialog shell with focus handling. |
| `molecules/UndoToast.svelte` | Toast with self-dismiss timer. |
| `molecules/CanvasStatus.svelte` | Status line for the canvas. |
| `molecules/WorkspaceFooter.svelte` | Status footer for the workspace. |
| `molecules/MenuItems.svelte` | Menu item list renderer. |
| `molecules/SettingsRow.svelte` | Settings line with label and control. |
| `molecules/SettingsCard.svelte` | Settings card container. |
| `molecules/CollapsibleSection.svelte` | Collapsible settings section. |
| `molecules/DialogActions.svelte` | Dialog action row. |
| `molecules/DialogError.svelte` | Dialog error message. |
| `molecules/TileSizeGrid.svelte` | Tile size picker. |
| `molecules/ColorSwatches.svelte` | Color swatch picker. |
| `molecules/BaseColorMode.svelte` | Custom base color control. |
| `molecules/FolderSelect.svelte` | Folder picker for commands. |
| `molecules/ThemePreview.svelte` | Theme preview card. |
| `molecules/ShaderThumb.svelte` | Shader thumbnail. |

### Organisms

| Component | Notes |
| --- | --- |
| `organisms/BookmarkTile.svelte` | Bookmark tile. |
| `organisms/FolderTile.svelte` | Folder tile. |
| `organisms/GridTile.svelte` | Drag-and-drop tile item. |
| `organisms/MetroGroup.svelte` | One folder group with its tiles. |
| `organisms/MetroAppBar.svelte` | Selection app bar. |
| `organisms/RootsNav.svelte` | Root filter navigation. |
| `organisms/CanvasContextMenu.svelte` | Canvas context menu. |
| `organisms/MetroSplash.svelte` | Startup splash. |
| `organisms/PageBackground.svelte` | Composes the configured background. |
| `organisms/ColorBackground.svelte` | Color background. |
| `organisms/ImageBackground.svelte` | Image background. |
| `organisms/ShaderBackground.svelte` | Shader background. |
| `organisms/Editor.svelte` | Dialog router. |
| `organisms/editor/BackgroundSettings.svelte` | Background settings panel. |
| `organisms/editor/SettingsDrawer.svelte` | Settings drawer. |
| `organisms/editor/ThemeGallery.svelte` | Theme picker gallery. |
| `organisms/editor/*Dialog.svelte` | Appearance, Bookmark, Copy, Delete, Destination and Folder dialogs, and the settings dialog. |

### Not in the hierarchy

| File | Reason |
| --- | --- |
| `ThemeSync.svelte` | Headless. Applies the theme. Renders nothing. |
| `tile-variants.ts`, `tile-props.ts`, `tilt.ts` | Shared helpers. No markup. |
| `components/ui/*/index.ts` | Re-export modules for the registry. |
| `organisms/editor/dialog-*.ts` | Headless dialog state and spec helpers. |

## Presentational boundary

Atoms, molecules and organisms receive data through props and emit events through callbacks. The test: a component renders identically in a Storybook story with mock props.

Two documented exceptions remain:

1. `atoms/FaviconIcon.svelte` reads no global state after the Phase 3 split. A container resolves the favicon cache and passes the result down.
2. `molecules/TileShell.svelte` and `organisms/*Tile.svelte` read `tile-grid-context` for the current grid cell size, and `TileShell` reads `mode-watcher` for the color mode. This avoids passing two extra props through every dragged tile. Do not add new readers of these contexts. New data flows through props.

## Tokens

Use the theme tokens that `src/lib/themes.ts` and the generator define (`--background`, `--card`, `--accent`, `--border`, `--foreground`, `--muted-foreground`, `--primary`, `--base00` through `--base0F`, plus the fixed `--destructive` pair).

Do not hard-code hex values, pixel font sizes or radii in components. Use Tailwind utilities that reference tokens. If a fixed color is truly needed, define it in the generator's shared derivation block and regenerate. Never edit the GENERATED regions in `src/styles.css` or `public/init-mode.js` by hand.

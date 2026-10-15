# Metro Bookmarks privacy

Metro reads and manages bookmarks in the browser profile where it is installed. The extension requests only `bookmarks` and `storage` permissions, plus the Chrome-only `favicon` permission used to read the browser's local favicon cache for tile icons.

- Bookmark titles, addresses, folders and native order belong to the browser's bookmark database.
- Layout coordinates, tile sizes, colors, chosen bundled icons and settings are stored locally in extension storage.
- Undo temporarily stores backups of deleted bookmarks/folders, including their URLs and appearance, for 30 seconds. Expired backups are pruned when the coordinator next reads or processes changes; expiry is not a secure-erasure guarantee.
- Presentation data is not uploaded and is not written to browser `storage.sync`.
- Tile icons come from your browser's local favicon cache only (Chrome). They are converted locally into Metro-style glyphs; no icon requests leave the browser.
- There are no accounts, telemetry, analytics, advertising requests or remote favicon/font services in the installed extension.
- Clicking a bookmark intentionally navigates to its website, which has its own privacy practices. The browser's own bookmark synchronization is separate and remains under browser settings.
- The standalone demo stores sample bookmarks and presentation data in that demo origin's local storage. It has no access to native bookmarks.

Uninstalling may remove local presentation and Undo information. It does not reverse changes already made to native bookmarks. Metro is not a bookmark backup service; keep a separate backup for important data.

Firefox's manifest declares no extension data collection. Storybook telemetry is disabled in this project's development configuration.

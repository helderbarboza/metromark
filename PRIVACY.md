# MetroMark privacy

MetroMark reads and manages bookmarks in the browser profile where it is installed. The extension requests only `bookmarks` and `storage` permissions, plus the Chrome-only `favicon` permission used to read the browser's local favicon cache for tile icons.

- Bookmark titles, addresses, folders and native order belong to the browser's bookmark database.
- Layout coordinates, tile sizes, colors, chosen bundled icons and settings are stored locally in extension storage.
- Undo temporarily stores backups of deleted bookmarks/folders, including their URLs and appearance, for 30 seconds. Expired backups are pruned when the coordinator next reads or processes changes; expiry is not a secure-erasure guarantee.
- Presentation data is not uploaded and is not written to browser `storage.sync`.
- An image background can load a remote image from the address you enter. The hosting server receives a request each time a new tab opens (without a `Referer` header). Uploaded images are stored in the extension origin's IndexedDB on this device and never leave it; they are removed with "Remove image", reclaimed automatically if they become unreferenced, and may be evicted under extreme disk pressure (re-uploading restores them).
- Fresh installs default to a remote photo hosted on Unsplash's CDN. Until you remove or replace it in the background editor, every new tab requests that image from images.unsplash.com (without a `Referer` header); Unsplash can see your IP address and user agent. Use "Remove image" or pick another background to stop those requests. If the image cannot load (for example, offline), the base color is shown instead.
- Tile icons come from your browser's local favicon cache only (Chrome). By default they are converted locally into Metro-style glyphs, and the glyphs are cached locally in IndexedDB (with a decoded-pixels fingerprint to detect favicon changes); with the "Original favicons" setting they are shown in their original colors. No icon requests leave the browser.
- There are no accounts, telemetry, analytics, advertising requests or remote favicon/font services in the installed extension.
- Clicking a bookmark intentionally navigates to its website, which has its own privacy practices. The browser's own bookmark synchronization is separate and remains under browser settings.
- The standalone demo stores sample bookmarks and presentation data in that demo origin's local storage. It has no access to native bookmarks.

Uninstalling may remove local presentation and Undo information. It does not reverse changes already made to native bookmarks. MetroMark is not a bookmark backup service; keep a separate backup for important data.

Firefox's manifest declares no extension data collection. Storybook telemetry is disabled in this project's development configuration.

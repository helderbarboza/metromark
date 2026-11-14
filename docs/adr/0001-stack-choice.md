# ADR 0001: Stack choice — Svelte 5 + Vite/WXT browser extension, no application backend

Status: accepted
Date: 2026-11-13

## Context

MetroMark replaces the browser new-tab page with a bookmark launcher and manager.

Hard constraints come from the product, not from preference:

- Browser bookmarks are the source of truth. There is nothing to synchronize or store server-side;
  the browser's own sync handles profile data. Presentation metadata (tile sizes, layout, background)
  is local to the extension.
- Privacy rules: no telemetry, no accounts, no remote services, no host permissions. Extension
  permissions are limited to `bookmarks`, `storage`, and Chrome-only `favicon`.
- The software ships as a browser extension (Chrome and Firefox MV3), not as a web app. The new-tab
  override must work offline and must not depend on a network to render.
- Node.js 24+ is the build/tooling runtime only; there is no server process at run time.

## Decision

- **Svelte 5 (runes) + TypeScript** for the UI.
- **Vite** for the isolated web preview (sample data, no real bookmarks, port 5173).
- **WXT** for the Chrome/Firefox MV3 builds from the same sources (`srcDir: src`), with explicit
  imports from `wxt/browser`, MV3 explicitly requested for Firefox, and browser-specific manifests.
- **Tailwind CSS 4** for styling, with theme tokens generated from Tinted Theming base16 schemes.
- **SnapGrid** for tile arrangement.
- **No application backend.** The extension talks to the browser `bookmarks`/`storage` APIs via
  adapters (`src/lib/adapters`), and to the background coordinator over extension messaging.

## Alternatives considered

### Backend frameworks (rejected)

- **Nest**: a full application framework with dependency injection, modules, decorators, and a
  server run-loop. There is no server to structure. It would add a hosted dependency, violating the
  minimal-permission and no-remote-service rules while solving nothing.
- **Fastify**: a fast HTTP framework. Same objection: any HTTP server implies a hosted endpoint the
  new tab depends on, accounts or proxying to reach bookmark data, and failure modes (network,
  latency, availability) the new-tab page cannot accept. It also widens the permission/attack surface.
- **Plain Express** (via `express`): the lightweight version of the same mistake. A tiny backend
  still means a remote origin for a local-first surface, and it ties the extension's uptime to
  infrastructure this product deliberately does not have.

There is no shape of "browser extension + Nest/Fastify/Express backend" that honors the constraints
above. A backend would only make sense if MetroMark grew account sync or a hosted service; both are out
of scope by policy.

### Frontend frameworks (React, considered)

- **React**: viable and widely supported, but for this surface it buys nothing over Svelte: the
  component tree is small (grid, tiles, menus, dialogs, footer), the reactive state is simple
  (selection, drag, undo, filters), and Svelte 5 runes express that with less ceremony and less
  client-side runtime for a page that runs on every new tab. Svelte's and WXT's first-class
  extension integrations also keep the MV3 service worker/event page wiring short.
- **Vue/others**: no decisive advantage over Svelte for this scope; not evaluated in depth.

## Consequences

- The extension is fully local-first; there is no account, server, or network dependency at run time.
- Build tooling is Node-only (`vite`, `wxt`, `vitest`, `storybook`); contributors need Node 24+.
- The preview (`npm run dev`) and the extension share `src/lib`; the adapter boundary keeps browser
  APIs out of presentation code and keeps the preview isolated.
- Features that would require a backend (hosted sync, remote favicons, telemetry) are explicitly
  excluded rather than deferred; revisiting that decision requires a new ADR.
- Testing is split into unit (`vitest` node project), story-based component tests (Storybook 10 +
  Playwright browser mode), and preview interaction tests (Playwright), because there is no server
  API to integration-test against.

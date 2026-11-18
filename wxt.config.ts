import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'
import { libAlias, metromarkDefines } from './build/shared.mjs'

export default defineConfig({
  srcDir: 'src',
  alias: { $lib: 'src/lib', $i18n: 'src/i18n' },
  modules: ['@wxt-dev/module-svelte'],
  imports: false,
  manifest: ({ browser }) => ({
    name: 'MetroMark — Your bookmarks at a glance',
    description: 'Make your new tab your own: Metro-style tiles, themes and backgrounds, with your bookmarks arranged your way.',
    // Chrome-only `favicon` permission for the local favicon-cache tier.
    // Firefox has no equivalent scheme, so it stays permission-free there.
    // `declarativeNetRequestWithHostAccess` + the youtube-nocookie host
    // permission let the extension set the Referer header on the YouTube
    // embed request; without it, current Chromium sends no Referer from
    // extension pages and YouTube refuses to play the embed (error 153).
    permissions: browser === 'firefox'
      ? ['bookmarks', 'storage', 'declarativeNetRequestWithHostAccess']
      : ['bookmarks', 'storage', 'favicon', 'declarativeNetRequestWithHostAccess'],
    host_permissions: ['https://www.youtube-nocookie.com/*'],
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    ...(browser === 'firefox'
      ? { browser_specific_settings: {
          gecko: {
            id: 'metromark@local.example',
            strict_min_version: '140.0',
            data_collection_permissions: { required: ['none'] },
          },
        } }
      : { minimum_chrome_version: '128' }),
  }),
  vite: () => ({
    build: { sourcemap: true },
    resolve: { alias: libAlias },
    define: { ...metromarkDefines, 'import.meta.env.METROMARK_PREVIEW': JSON.stringify(false) },
    plugins: [tailwindcss()],
  }),
})

import process from 'node:process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

const libDir = fileURLToPath(new URL('./src/lib', import.meta.url))

export default defineConfig({
  srcDir: 'src',
  alias: { $lib: 'src/lib' },
  modules: ['@wxt-dev/module-svelte'],
  imports: false,
  manifest: ({ browser }) => ({
    name: 'Metro — Bookmarks, beautifully arranged',
    description: 'A Metro-inspired new tab and bookmark manager. Local-first, with live bookmark updates and Undo.',
    // Chrome-only `favicon` permission for the local favicon-cache tier.
    // Firefox has no equivalent scheme, so it stays permission-free there.
    permissions: browser === 'firefox' ? ['bookmarks', 'storage'] : ['bookmarks', 'storage', 'favicon'],
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    ...(browser === 'firefox'
      ? { browser_specific_settings: {
          gecko: {
            id: 'metro-bookmarks@local.example',
            strict_min_version: '140.0',
            data_collection_permissions: { required: ['none'] },
          },
        } }
      : { minimum_chrome_version: '128' }),
  }),
  vite: () => ({
    build: { sourcemap: true },
    resolve: { alias: { $lib: libDir } },
    define: {
      'import.meta.env.METRO_DENSITY': JSON.stringify(process.env.METRO_DENSITY),
      'import.meta.env.METRO_SHOW_DOMAINS': JSON.stringify(process.env.METRO_SHOW_DOMAINS),
      'import.meta.env.METRO_REDUCED_MOTION': JSON.stringify(process.env.METRO_REDUCED_MOTION),
    },
    plugins: [tailwindcss()],
  }),
})

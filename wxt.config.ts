import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  imports: false,
  manifest: ({ browser }) => ({
    name: 'Metro — Bookmarks, beautifully arranged',
    description: 'A Metro-inspired new tab and bookmark manager. Local-first, with live bookmark updates and Undo.',
    // Chrome-only `favicon` permission for the local favicon-cache tier.
    // Firefox has no equivalent scheme, so it stays permission-free there.
    permissions: browser === 'firefox' ? ['bookmarks', 'storage'] : ['bookmarks', 'storage', 'favicon'],
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    ...(browser === 'firefox' ? { browser_specific_settings: {
      gecko: {
        id: 'metro-bookmarks@local.example',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
    } } : { minimum_chrome_version: '128' }),
  }),
  vite: () => ({ plugins: [tailwindcss()] }),
});

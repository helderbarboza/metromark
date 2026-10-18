import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  cacheDir: 'node_modules/.vite/preview',
  plugins: [svelte(), tailwindcss()],
  server: { host: '0.0.0.0', allowedHosts: true, port: 5173, watch: { ignored: ['**/.output/**', '**/storybook-static/**', '**/release/**', '**/.arena/**', '**/test-results/**'] } },
  build: { outDir: 'dist/preview' },
})

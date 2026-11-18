import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { libAlias } from './build/shared.mjs'

export default defineConfig({
  cacheDir: 'node_modules/.vite/vitest',
  resolve: { alias: libAlias },
  plugins: [
    svelte(),
    tailwindcss(),
  ],
  test: {
    maxWorkers: 1,
    fileParallelism: false,
    browser: { connectTimeout: 60000 },
    projects: [
      {
        resolve: { alias: libAlias },
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: '.storybook', storybookScript: 'npm run storybook -- --ci' }),
        ],
        test: {
          name: 'storybook',
          fileParallelism: false,
          maxWorkers: 1,
          browser: {
            connectTimeout: 60000,
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: {
                args: ['--no-sandbox'],
              },
            }),
            instances: [
              { browser: 'chromium' },
            ],
          },
        },
      },
    ],
  },
})

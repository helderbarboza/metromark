import type { StorybookConfig } from '@storybook/svelte-vite'
import { fileURLToPath } from 'node:url'

const libDir = fileURLToPath(new URL('../src/lib', import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/lib/stories/**/*.stories.@(ts|svelte)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-svelte-csf', '@storybook/addon-vitest'],
  framework: '@storybook/svelte-vite',
  core: { disableTelemetry: true },
  features: { backgrounds: false },
  viteFinal: config => ({
    ...config,
    cacheDir: 'node_modules/.vite/storybook',
    resolve: { ...config.resolve, alias: { ...config.resolve?.alias, $lib: libDir } },
  }),
  docs: { defaultName: 'Documentation' },
  typescript: { check: false },
}
export default config

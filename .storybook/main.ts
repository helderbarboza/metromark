import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  stories: ['../src/lib/stories/**/*.stories.@(ts|svelte)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-svelte-csf', '@storybook/addon-vitest'],
  framework: '@storybook/svelte-vite',
  core: { disableTelemetry: true },
  viteFinal: (config) => ({ ...config, cacheDir: 'node_modules/.vite/storybook' }),
  docs: { defaultName: 'Documentation' },
  typescript: { check: false },
};
export default config;

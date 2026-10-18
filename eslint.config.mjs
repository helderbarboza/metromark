import antfu from '@antfu/eslint-config'
import storybook from 'eslint-plugin-storybook'
import svelte from 'eslint-plugin-svelte'

export default antfu(
  {
    type: 'app',
    typescript: {
      tsconfigPath: 'tsconfig.json',
    },
    svelte: true,
    stylistic: true,
    lessOpinionated: false,
    formatters: false,
    ignores: [
      'release/**',
      'public/**',
    ],
    // Vitest rules apply to unit tests only; `e2e/**` is Playwright, not Vitest.
    test: {
      files: ['tests/**/*.test.ts'],
    },
  },
  ...svelte.configs.recommended,
  ...storybook.configs['flat/recommended'],
  // Tag formatting plus a width cap for long single-line markup.
  {
    files: ['**/*.svelte'],
    rules: {
      'svelte/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
      'svelte/first-attribute-linebreak': ['error', { singleline: 'beside', multiline: 'below' }],
      'svelte/html-closing-bracket-new-line': ['error', { singleline: 'never', multiline: 'always' }],
      'style/max-len': ['warn', { code: 160, tabWidth: 2, ignoreUrls: true }],
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['warn', { assertionStyle: 'never' }],
    },
  },
  // Node scripts and the Playwright config use the global `process` intentionally.
  {
    files: ['scripts/**/*', 'playwright.config.ts'],
    rules: {
      'node/prefer-global/process': 'off',
    },
  },
)

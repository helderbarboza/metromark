import antfu from '@antfu/eslint-config'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
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
  {
    plugins: { 'better-tailwindcss': betterTailwindcss },
    rules: {
      ...betterTailwindcss.configs['recommended-warn'].rules,
    },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/styles.css' },
    },
  },
  // Tag formatting plus a width cap for long single-line markup.
  {
    files: ['**/*.svelte'],
    rules: {
      'better-tailwindcss/no-unknown-classes': 'off',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/enforce-canonical-classes': ['error', { rootFontSize: 16 }],
      'better-tailwindcss/enforce-consistent-line-wrapping': ['warn', { printWidth: 90, preferSingleLine: true, group: 'newLine', strictness: 'loose' }],
      'svelte/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
      'svelte/first-attribute-linebreak': ['error', { multiline: 'below', singleline: 'beside' }],
      'svelte/html-closing-bracket-new-line': ['error', { singleline: 'never', multiline: 'always' }],
      'style/max-len': [
        'warn',
        {
          code: 100,
          tabWidth: 2,
          ignoreUrls: true,
          // Long Tailwind class strings and class-heavy markup (e.g. arbitrary
          // values such as active:transform-[...] and inline class={...}).
          ignorePattern: 'class[=\\s{]|:[a-zA-Z-]*\\[[^\\]]*\\]',
        },
      ],
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
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

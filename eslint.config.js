import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      'apps/site/public',
      '**/.astro',
      '**/node_modules',
      '**/coverage',
      '.playwright-mcp',
      'apps/extension/src/components/ui/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser, chrome: 'readonly' },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  { files: ['**/*.config.{js,ts}', '**/scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  // Parts of the end-to-end script are serialised into the page and run in the browser.
  { files: ['scripts/e2e.mjs', 'scripts/capture.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  prettier,
)

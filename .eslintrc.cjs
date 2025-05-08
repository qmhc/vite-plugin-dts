const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  extends: ['@vexip-ui/eslint-config'],
  root: true,
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'vue/no-v-html': 'off',
    'vue/no-textarea-mustache': 'off',
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
  },
})

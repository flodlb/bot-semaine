const globals = require('globals')
const pluginJs = require('@eslint/js')
const stylisticJs = require('@stylistic/eslint-plugin-js')

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser   // ✔️ Playwright DOM globals
      }
    }
  },
  {
    plugins: {
      '@stylistic/js': stylisticJs
    },
    rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      '@stylistic/js/indent': ['error', 2],
      '@stylistic/js/eol-last': ['error', 'always']
    }
  },
  {
    ignores: ['staticFiles.js']
  },
  pluginJs.configs.recommended
]

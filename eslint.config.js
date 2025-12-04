import globals from 'globals'
import pluginJs from '@eslint/js'
import stylisticJs from '@stylistic/eslint-plugin-js'

  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.browser
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
  pluginJs.configs.recommended,
]


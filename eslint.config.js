// @ts-check

import eslintJs from '@eslint/js'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import * as vueEslintConfigTypescript from '@vue/eslint-config-typescript'

import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default vueEslintConfigTypescript.defineConfigWithVueTs(
  ...pluginVue.configs['flat/essential'],
  eslintJs.configs.recommended,
  skipFormatting,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  vueEslintConfigTypescript.vueTsConfigs.recommended,
  {
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: {
          js: tseslint.parser,
          ts: tseslint.parser
        },
        projectService: {
          allowDefaultProject: ['scripts/*.js', 'src/renderer/*.js']
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,ts,vue}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['out/**']
  }
)

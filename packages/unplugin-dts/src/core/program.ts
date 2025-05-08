import {
  createParsedCommandLine,
  createVueLanguagePlugin,
  resolveVueCompilerOptions,
} from '@vue/language-core'

import { proxyCreateProgram } from '@volar/typescript'
import ts from 'typescript'
import { tryGetPackageInfo } from './utils'

export { createParsedCommandLine }

const hasVue = !!tryGetPackageInfo('vue')

// If there has no Vue dependency, we think it's a normal TypeScript project.
// So we use the original createProgram of TypeScript.
export const createProgram = !hasVue
  ? ts.createProgram
  : proxyCreateProgram(ts, ts.createProgram, (ts, options) => {
    const { configFilePath } = options.options
    const vueOptions =
        typeof configFilePath === 'string'
          ? createParsedCommandLine(ts, ts.sys, configFilePath.replace(/\\/g, '/')).vueOptions
          : resolveVueCompilerOptions({})

    const vueLanguagePlugin = createVueLanguagePlugin<string>(
      ts,
      options.options,
      vueOptions,
      id => id,
    )
    return [vueLanguagePlugin]
  })

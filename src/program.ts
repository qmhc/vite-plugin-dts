import {
  createParsedCommandLine,
  createRootFileChecker,
  createVueLanguagePlugin2,
  resolveVueCompilerOptions
} from '@vue/language-core'

import { proxyCreateProgram } from '@volar/typescript'
import ts from 'typescript'

import { removeEmitGlobalTypes } from 'vue-tsc'

export { createParsedCommandLine }

export const createProgram = proxyCreateProgram(ts, ts.createProgram, (ts, options) => {
  const { configFilePath } = options.options
  const vueOptions =
    typeof configFilePath === 'string'
      ? createParsedCommandLine(ts, ts.sys, configFilePath.replace(/\\/g, '/')).vueOptions
      : resolveVueCompilerOptions({})

  if (options.host) {
    const writeFile = options.host.writeFile.bind(options.host)
    options.host.writeFile = (fileName, contents, ...args) => {
      return writeFile(fileName, removeEmitGlobalTypes(contents), ...args)
    }
  }

  const vueLanguagePlugin = createVueLanguagePlugin2<string>(
    ts,
    id => id,
    createRootFileChecker(
      undefined,
      () => options.rootNames.map(rootName => rootName.replace(/\\/g, '/')),
      options.host?.useCaseSensitiveFileNames?.() ?? false
    ),
    options.options,
    vueOptions
  )
  return [vueLanguagePlugin]
})

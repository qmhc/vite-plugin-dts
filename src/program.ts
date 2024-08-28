import {
  createParsedCommandLine,
  createRootFileChecker,
  createVueLanguagePlugin2,
  resolveVueCompilerOptions
} from '@vue/language-core'

import { proxyCreateProgram } from '@volar/typescript'
import ts from 'typescript'
import { getPackageInfoSync, resolveModule } from 'local-pkg'
import { removeEmitGlobalTypes } from 'vue-tsc'

export { createParsedCommandLine }

let hasVue = false

try {
  hasVue = !!(
    getPackageInfoSync('vue') ??
    getPackageInfoSync('svelte', { paths: [resolveModule('svelte') || process.cwd()] })
  )
} catch (e) {}

// If there has no Vue dependency, we think it's a normal TypeScript project.
// So we use the original createProgram of TypeScript.
const _createProgram = !hasVue
  ? ts.createProgram
  : proxyCreateProgram(ts, ts.createProgram, (ts, options) => {
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

export const createProgram = !hasVue
  ? ts.createProgram
  : (options: ts.CreateProgramOptions) => {
      const program = _createProgram(options)

      const emit = program.emit
      program.emit = (
        targetSourceFile,
        writeFile,
        cancellationToken,
        emitOnlyDtsFiles,
        customTransformers
      ) => {
        if (writeFile) {
          return emit(
            targetSourceFile,
            (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
              if (fileName.endsWith('.d.ts')) {
                data = removeEmitGlobalTypes(data)
              }
              return writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles)
            },
            cancellationToken,
            emitOnlyDtsFiles,
            customTransformers
          )
        }

        return emit(
          targetSourceFile,
          writeFile,
          cancellationToken,
          emitOnlyDtsFiles,
          customTransformers
        )
      }

      return program
    }

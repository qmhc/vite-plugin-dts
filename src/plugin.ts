import { basename } from 'node:path'

import ts from 'typescript'

import { cyan, green, yellow } from 'kolorist'
import { createRuntimeContext, emitOutput, transform } from './core'
import {
  defaultIndex,
  dtsRE,
  ensureAbsolute,
  ensureArray,
  getJsExtPrefix,
  handleDebug,
  isNativeObj,
  isRegExp,
  normalizePath,
  resolve,
  tjsRE,
  unwrapPromise
} from './utils'

import type { Alias, Logger } from 'vite'
import type { PluginOptions } from './types'
import type { RuntimeContext } from './core/types'

const pluginName = 'vite:dts'
const logPrefix = cyan(`[${pluginName}]`)

export function dtsPlugin(options: PluginOptions = {}): import('vite').Plugin {
  const {
    tsconfigPath,
    logLevel,
    staticImport = false,
    clearPureImport = true,
    cleanVueFileName = false,
    insertTypesEntry = false,
    rollupTypes = false,
    pathsToAliases = true,
    aliasesExclude = [],
    rollupOptions = {},
    copyDtsFiles = false,
    declarationOnly = false,
    strictOutput = true,
    afterDiagnostic,
    beforeWriteFile,
    afterRollup,
    afterBuild,

    include,
    exclude,
    compilerOptions,
    resolvers,
    entryRoot
  } = options

  let root = ensureAbsolute(options.root ?? '', process.cwd())
  let outDirs: string[]
  let entries: Record<string, string>
  let aliases: Alias[]
  let libName: string
  let indexName: string
  let logger: Logger

  let bundled = false
  let timeRecord = 0

  let runtime: RuntimeContext

  return {
    name: pluginName,

    apply: 'build',

    enforce: 'pre',

    config(config) {
      const aliasOptions = config?.resolve?.alias ?? []

      if (isNativeObj(aliasOptions)) {
        aliases = Object.entries(aliasOptions).map(([key, value]) => {
          return { find: key, replacement: value }
        })
      } else {
        aliases = ensureArray(aliasOptions as Alias[]).map(alias => ({ ...alias }))
      }

      if (aliasesExclude.length > 0) {
        aliases = aliases.filter(
          ({ find }) =>
            !aliasesExclude.some(
              aliasExclude =>
                aliasExclude &&
                (isRegExp(find)
                  ? find.toString() === aliasExclude.toString()
                  : isRegExp(aliasExclude)
                    ? find.match(aliasExclude)?.[0]
                    : find === aliasExclude)
            )
        )
      }

      for (const alias of aliases) {
        alias.replacement = resolve(alias.replacement)
      }
    },

    async configResolved(config) {
      logger = logLevel
        ? (await import('vite')).createLogger(logLevel, { allowClearScreen: config.clearScreen })
        : config.logger

      root = ensureAbsolute(options.root ?? '', config.root)

      if (config.build.lib) {
        const input =
          typeof config.build.lib.entry === 'string'
            ? [config.build.lib.entry]
            : config.build.lib.entry

        if (Array.isArray(input)) {
          entries = input.reduce(
            (prev, current) => {
              prev[basename(current)] = current
              return prev
            },
            {} as Record<string, string>
          )
        } else {
          entries = { ...input }
        }

        const filename = config.build.lib.fileName ?? defaultIndex
        const entry =
          typeof config.build.lib.entry === 'string'
            ? config.build.lib.entry
            : Object.values(config.build.lib.entry)[0]

        libName = config.build.lib.name || '_default'
        indexName = typeof filename === 'string' ? filename : filename('es', entry)

        if (!dtsRE.test(indexName)) {
          indexName = `${indexName.replace(tjsRE, '')}.d.${getJsExtPrefix(indexName)}ts`
        }
      } else {
        logger.warn(
          `\n${logPrefix} ${yellow(
            'You are building a library that may not need to generate declaration files.'
          )}\n`
        )

        libName = '_default'
        indexName = defaultIndex
      }

      if (!options.outDirs) {
        outDirs = [ensureAbsolute(config.build.outDir, root)]
      }

      handleDebug('parse vite config')
    },

    options(options) {
      if (entries) return

      const input = typeof options.input === 'string' ? [options.input] : options.input

      if (Array.isArray(input)) {
        entries = input.reduce(
          (prev, current) => {
            prev[basename(current)] = current
            return prev
          },
          {} as Record<string, string>
        )
      } else {
        entries = { ...input }
      }

      logger = logger || console
      aliases = aliases || []
      libName = '_default'
      indexName = defaultIndex

      handleDebug('parse options')
    },

    async buildStart() {
      if (runtime) return

      handleDebug('begin buildStart')
      timeRecord = 0
      const startTime = Date.now()

      runtime = await createRuntimeContext({
        root,
        outDirs: options.outDirs ?? outDirs,
        entryRoot,
        tsconfigPath,
        compilerOptions,
        pathsToAliases,
        include,
        exclude,
        resolvers,
        entries,
        aliases,
        libName,
        indexName,
        logger,
        afterDiagnostic
      })

      for (const file of runtime.rootNames) {
        this.addWatchFile(file)
      }

      handleDebug('create ts program')
      timeRecord += Date.now() - startTime
    },

    async transform(code, id) {
      id = normalizePath(id).split('?')[0]

      if (!runtime) return

      const startTime = Date.now()

      await transform(runtime, id, code)

      timeRecord += Date.now() - startTime
    },

    watchChange(id) {
      id = normalizePath(id)

      if (
        !runtime ||
        !runtime.filter(id) ||
        (!runtime.resolvers.find(r => r.supports(id)) && !tjsRE.test(id))
      ) {
        return
      }

      id = id.split('?')[0]
      const sourceFile = runtime.host.getSourceFile(id, ts.ScriptTarget.ESNext)

      if (sourceFile) {
        for (const file of runtime.rootNames) {
          runtime.rootFiles.add(file)
        }

        runtime.rootFiles.add(normalizePath(sourceFile.fileName))

        bundled = false
        timeRecord = 0
        // We lose the fast way to trigger source file re-emit in Volar 1,
        // so now we have to rebuild the program to get the latest declaration
        // files of those changed files.
        runtime.program = runtime.rebuildProgram()
      }
    },

    async writeBundle() {
      runtime.transformedFiles.clear()

      if (!runtime || bundled) return

      bundled = true
      handleDebug('begin writeBundle')
      logger.info(green(`\n${logPrefix} Start generate declaration files...`))

      const startTime = Date.now()

      const emittedFiles = await emitOutput(runtime, {
        strictOutput,
        copyDtsFiles,
        cleanVueFileName,
        aliasesExclude,
        staticImport,
        clearPureImport,
        insertTypesEntry,
        rollupTypes,
        rollupOptions,
        logPrefix,
        beforeWriteFile,
        afterRollup
      })

      if (typeof afterBuild === 'function') {
        await unwrapPromise(afterBuild(emittedFiles))
      }

      handleDebug('finish')
      logger.info(
        green(`${logPrefix} Declaration files built in ${timeRecord + Date.now() - startTime}ms.\n`)
      )
    },

    generateBundle(_, bundle) {
      if (declarationOnly) {
        for (const id of Object.keys(bundle)) {
          delete bundle[id]
        }
      }
    }
  }
}

import { basename, dirname, relative } from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { cpus } from 'node:os'

import { createParsedCommandLine } from '@vue/language-core'

import ts from 'typescript'
import { createFilter } from '@rollup/pluginutils'
import { createProgram } from 'vue-tsc'
import debug from 'debug'
import { cyan, green, yellow } from 'kolorist'
import { rollupDeclarationFiles } from './rollup'
import { JsonResolver, SvelteResolver, VueResolver, parseResolvers } from './resolvers'
import {
  normalizeGlob,
  removePureImport,
  transformAliasImport,
  transformDynamicImport
} from './transform'
import {
  ensureAbsolute,
  ensureArray,
  fileTypesPath,
  isNativeObj,
  isRegExp,
  normalizePath,
  queryPublicPath,
  removeDirIfEmpty,
  resolve,
  runParallel,
  toCapitalCase,
  tryGetPkgPath,
  wrapPromise
} from './utils'

import type { Alias, Logger } from 'vite'
import type { _Program as Program } from 'vue-tsc'
import type { PluginOptions, Resolver } from './types'

const jsRE = /\.(m|c)?jsx?$/
const tsRE = /\.(m|c)?tsx?$/
const dtsRE = /\.d\.(m|c)?tsx?$/
const tjsRE = /\.(m|c)?(t|j)sx?$/
const mtjsRE = /\.m(t|j)sx?$/
const ctjsRE = /\.c(t|j)sx?$/
const fullRelativeRE = /^\.\.?\//
const defaultIndex = 'index.d.ts'

const logPrefix = cyan('[vite:dts]')
const bundleDebug = debug('vite-plugin-dts:bundle')

const fixedCompilerOptions: ts.CompilerOptions = {
  noEmit: false,
  declaration: true,
  emitDeclarationOnly: true,
  noUnusedParameters: false,
  checkJs: false,
  skipLibCheck: true,
  preserveSymlinks: false,
  noEmitOnError: undefined,
  target: ts.ScriptTarget.ESNext
}

const noop = () => {}
const extPrefix = (file: string) => (mtjsRE.test(file) ? 'm' : ctjsRE.test(file) ? 'c' : '')

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
    afterDiagnostic = noop,
    beforeWriteFile = noop,
    afterBuild = noop
  } = options

  let root = ensureAbsolute(options.root ?? '', process.cwd())
  let publicRoot = ''
  let entryRoot = options.entryRoot ?? ''

  let configPath: string | undefined
  let compilerOptions: ts.CompilerOptions
  let rawCompilerOptions: ts.CompilerOptions

  let outDirs: string[]
  let entries: Record<string, string>
  let include: string[]
  let exclude: string[]
  let aliases: Alias[]
  let libName: string
  let indexName: string
  let logger: Logger
  let host: ts.CompilerHost | undefined
  let program: Program | undefined
  let filter: ReturnType<typeof createFilter>

  let bundled = false
  let timeRecord = 0

  const resolvers = parseResolvers([
    JsonResolver(),
    VueResolver(),
    SvelteResolver(),
    ...(options.resolvers || [])
  ])

  const rootFiles = new Set<string>()
  const outputFiles = new Map<string, string>()

  const rollupConfig = { ...(options.rollupConfig || {}) }
  rollupConfig.bundledPackages = rollupConfig.bundledPackages || options.bundledPackages || []

  return {
    name: 'vite:dts',

    apply: 'build',

    enforce: 'pre',

    config(config) {
      const aliasOptions = config?.resolve?.alias ?? []

      if (isNativeObj(aliasOptions)) {
        aliases = Object.entries(aliasOptions).map(([key, value]) => {
          return { find: key, replacement: value }
        })
      } else {
        aliases = ensureArray(aliasOptions)
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
          entries = input.reduce((prev, current) => {
            prev[basename(current)] = current
            return prev
          }, {} as Record<string, string>)
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
          indexName = `${indexName.replace(tjsRE, '')}.d.${extPrefix(indexName)}ts`
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

      if (!options.outDir) {
        outDirs = [ensureAbsolute(config.build.outDir, root)]
      }

      bundleDebug('parse vite config')
    },

    options(options) {
      if (entries) return

      const input = typeof options.input === 'string' ? [options.input] : options.input

      if (Array.isArray(input)) {
        entries = input.reduce((prev, current) => {
          prev[basename(current)] = current
          return prev
        }, {} as Record<string, string>)
      } else {
        entries = { ...input }
      }

      logger = logger || console
      aliases = aliases || []
      libName = '_default'
      indexName = defaultIndex

      bundleDebug('parse options')
    },

    async buildStart() {
      if (program) return

      bundleDebug('begin buildStart')
      timeRecord = 0
      const startTime = Date.now()

      configPath = tsconfigPath
        ? ensureAbsolute(tsconfigPath, root)
        : ts.findConfigFile(root, ts.sys.fileExists)

      const content = configPath
        ? createParsedCommandLine(ts as any, ts.sys, configPath)
        : undefined

      compilerOptions = {
        // (#277) If user don't specify `moduleResolution` in top config file,
        // declaration of Vue files will be inferred to `any` type.
        moduleResolution: ts.ModuleResolutionKind.Node10,
        ...(content?.options || {}),
        ...(options.compilerOptions || {}),
        ...fixedCompilerOptions,
        outDir: '.',
        declarationDir: '.'
      }
      rawCompilerOptions = content?.raw.compilerOptions || {}

      if (!outDirs) {
        outDirs = options.outDir
          ? ensureArray(options.outDir).map(d => ensureAbsolute(d, root))
          : [ensureAbsolute(content?.raw.compilerOptions?.outDir || 'dist', root)]
      }

      const { baseUrl, paths } = compilerOptions

      if (pathsToAliases && baseUrl && paths) {
        const basePath = ensureAbsolute(baseUrl, configPath ? dirname(configPath) : root)
        const existsFinds = new Set(
          aliases.map(alias => alias.find).filter(find => typeof find === 'string')
        )

        for (const [findWithAsterisk, replacements] of Object.entries(paths)) {
          const find = findWithAsterisk.replace('/*', '')

          if (!replacements.length || existsFinds.has(find)) continue

          aliases.push({
            find,
            replacement: ensureAbsolute(replacements[0].replace('/*', ''), basePath)
          })
        }
      }

      const computeGlobs = (
        rootGlobs: string | string[] | undefined,
        tsGlobs: string | string[] | undefined,
        defaultGlob: string | string[]
      ) => {
        if (rootGlobs?.length) {
          return ensureArray(rootGlobs).map(glob => normalizeGlob(ensureAbsolute(glob, root)))
        }

        return ensureArray(tsGlobs?.length ? tsGlobs : defaultGlob).map(glob =>
          normalizeGlob(ensureAbsolute(glob, configPath ? dirname(configPath) : root))
        )
      }

      include = computeGlobs(options.include, content?.raw.include, '**/*')
      exclude = computeGlobs(options.exclude, content?.raw.exclude, 'node_modules/**')

      filter = createFilter(include, exclude)

      const rootNames = [
        ...new Set(
          Object.values(entries)
            .map(entry => ensureAbsolute(entry, root))
            .concat(content?.fileNames.filter(filter) || [])
            .map(normalizePath)
        )
      ]

      host = ts.createCompilerHost(compilerOptions)
      program = createProgram({
        host,
        rootNames,
        projectReferences: content?.projectReferences,
        options: compilerOptions
      })

      libName = toCapitalCase(libName || '_default')
      indexName = indexName || defaultIndex

      const maybeEmitted = (sourceFile: ts.SourceFile) => {
        return (
          !(compilerOptions.noEmitForJsFiles && jsRE.test(sourceFile.fileName)) &&
          !sourceFile.isDeclarationFile &&
          !program!.isSourceFileFromExternalLibrary(sourceFile)
        )
      }

      publicRoot = compilerOptions.rootDir
        ? ensureAbsolute(compilerOptions.rootDir, root)
        : compilerOptions.composite && compilerOptions.configFilePath
          ? dirname(compilerOptions.configFilePath as string)
          : queryPublicPath(
            program
              .getSourceFiles()
              .filter(maybeEmitted)
              .map(sourceFile => sourceFile.fileName)
          )
      publicRoot = normalizePath(publicRoot)
      entryRoot = entryRoot || publicRoot
      entryRoot = ensureAbsolute(entryRoot, root)

      const diagnostics = program.getDeclarationDiagnostics()

      if (diagnostics?.length) {
        logger.error(ts.formatDiagnostics(diagnostics, host))
      }

      if (typeof afterDiagnostic === 'function') {
        await wrapPromise(afterDiagnostic(diagnostics))
      }

      rootNames.forEach(file => {
        this.addWatchFile(file)
        rootFiles.add(file)
      })

      bundleDebug('create ts program')
      timeRecord += Date.now() - startTime
    },

    async transform(code, id) {
      let resolver: Resolver | undefined
      id = normalizePath(id)

      if (
        !host ||
        !program ||
        !filter(id) ||
        (!(resolver = resolvers.find(r => r.supports(id))) && !tjsRE.test(id))
      ) {
        return
      }

      const startTime = Date.now()
      const outDir = outDirs[0]
      const service = program.__vue.languageService as unknown as ts.LanguageService

      id = id.split('?')[0]
      rootFiles.delete(id)

      if (resolver) {
        const result = await resolver.transform({
          id,
          code,
          root: publicRoot,
          outDir,
          host,
          program,
          service
        })

        for (const { path, content } of result) {
          outputFiles.set(
            resolve(publicRoot, relative(outDir, ensureAbsolute(path, outDir))),
            content
          )
        }
      } else {
        const sourceFile = program.getSourceFile(id)

        if (sourceFile) {
          for (const outputFile of service.getEmitOutput(sourceFile.fileName, true).outputFiles) {
            outputFiles.set(
              resolve(publicRoot, relative(outDir, ensureAbsolute(outputFile.name, outDir))),
              outputFile.text
            )
          }
        }
      }

      const dtsId = id.replace(tjsRE, '') + '.d.ts'
      const dtsSourceFile = program.getSourceFile(dtsId)

      dtsSourceFile &&
        filter(dtsSourceFile.fileName) &&
        outputFiles.set(normalizePath(dtsSourceFile.fileName), dtsSourceFile.getFullText())

      timeRecord += Date.now() - startTime
    },

    watchChange(id) {
      id = normalizePath(id)

      if (
        !host ||
        !program ||
        !filter(id) ||
        (!resolvers.find(r => r.supports(id)) && !tjsRE.test(id))
      ) {
        return
      }

      id = id.split('?')[0]
      const sourceFile = host.getSourceFile(id, ts.ScriptTarget.ESNext)

      if (sourceFile) {
        rootFiles.add(sourceFile.fileName)
        program.__vue.projectVersion++
        bundled = false
        timeRecord = 0
      }
    },

    async writeBundle() {
      if (!host || !program || bundled) return

      bundled = true
      bundleDebug('begin writeBundle')
      logger.info(green(`\n${logPrefix} Start generate declaration files...`))

      const startTime = Date.now()

      const outDir = outDirs[0]
      const emittedFiles = new Map<string, string>()

      const writeOutput = async (path: string, content: string, outDir: string, record = true) => {
        if (typeof beforeWriteFile === 'function') {
          const result = await wrapPromise(beforeWriteFile(path, content))

          if (result === false) return

          if (result) {
            path = result.filePath || path
            content = result.content ?? content
          }
        }

        path = normalizePath(path)
        const dir = normalizePath(dirname(path))

        if (strictOutput && !dir.startsWith(normalizePath(outDir))) {
          logger.warn(`${logPrefix} ${yellow('Outside emitted:')} ${path}`)
          return
        }

        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true })
        }

        await writeFile(path, content, 'utf-8')
        record && emittedFiles.set(path, content)
      }

      const service = program.__vue.languageService
      const sourceFiles = program.getSourceFiles()

      for (const sourceFile of sourceFiles) {
        if (!filter(sourceFile.fileName)) continue

        if (copyDtsFiles && dtsRE.test(sourceFile.fileName)) {
          outputFiles.set(normalizePath(sourceFile.fileName), sourceFile.getFullText())
        }

        if (rootFiles.has(sourceFile.fileName)) {
          for (const outputFile of service.getEmitOutput(sourceFile.fileName, true).outputFiles) {
            outputFiles.set(
              resolve(publicRoot, relative(outDir, ensureAbsolute(outputFile.name, outDir))),
              outputFile.text
            )
          }

          rootFiles.delete(sourceFile.fileName)
        }
      }

      bundleDebug('emit output patch')

      const currentDir = host.getCurrentDirectory()

      await runParallel(
        cpus().length,
        Array.from(outputFiles.entries()),
        async ([path, content]) => {
          const isMapFile = path.endsWith('.map')
          const baseDir = dirname(path)

          if (!isMapFile && content) {
            content = clearPureImport ? removePureImport(content) : content
            content = transformAliasImport(path, content, aliases, aliasesExclude)
            content = staticImport || rollupTypes ? transformDynamicImport(content) : content
          }

          path = resolve(
            outDir,
            relative(entryRoot, cleanVueFileName ? path.replace('.vue.d.ts', '.d.ts') : path)
          )
          content = cleanVueFileName ? content.replace(/['"](.+)\.vue['"]/g, '"$1"') : content

          if (isMapFile) {
            try {
              const sourceMap: { sources: string[] } = JSON.parse(content)

              sourceMap.sources = sourceMap.sources.map(source => {
                return normalizePath(
                  relative(
                    dirname(path),
                    resolve(currentDir, relative(publicRoot, baseDir), source)
                  )
                )
              })
              content = JSON.stringify(sourceMap)
            } catch (e) {
              logger.warn(`${logPrefix} ${yellow('Processing source map fail:')} ${path}`)
            }
          }

          await writeOutput(path, content, outDir)
        }
      )

      bundleDebug('write output')

      if (insertTypesEntry || rollupTypes) {
        const pkgPath = tryGetPkgPath(root)

        let pkg: any

        try {
          pkg = pkgPath && existsSync(pkgPath) ? JSON.parse(await readFile(pkgPath, 'utf-8')) : {}
        } catch (e) {}

        const entryNames = Object.keys(entries)
        const types = fileTypesPath(pkg.publishConfig, pkg)
        const multiple = entryNames.length > 1

        let typesPath = types ? resolve(root, types) : resolve(outDir, indexName)

        if (!multiple && !dtsRE.test(typesPath)) {
          logger.warn(
            `\n${logPrefix} ${yellow(
              "The resolved path of type entry is not ending with '.d.ts'."
            )}\n`
          )

          typesPath = `${typesPath.replace(tjsRE, '')}.d.${extPrefix(typesPath)}ts`
        }

        for (const name of entryNames) {
          const path = multiple ? resolve(outDir, `${name.replace(tsRE, '')}.d.ts`) : typesPath

          if (existsSync(path)) continue

          const index = resolve(
            outDir,
            relative(entryRoot, `${entries[name].replace(tsRE, '')}.d.ts`)
          )

          let fromPath = normalizePath(relative(dirname(path), index))

          fromPath = fromPath.replace(dtsRE, '')
          fromPath = fullRelativeRE.test(fromPath) ? fromPath : `./${fromPath}`

          let content = `export * from '${fromPath}'\n`

          if (existsSync(index)) {
            const entryCodes = await readFile(index, 'utf-8')

            if (entryCodes.includes('export default')) {
              content += `import ${libName} from '${fromPath}'\nexport default ${libName}\n`
            }
          }

          await writeOutput(path, content, outDir)
        }

        bundleDebug('insert index')

        if (rollupTypes) {
          logger.info(green(`${logPrefix} Start rollup declaration files...`))

          let libFolder: string | undefined = resolve(root, 'node_modules/typescript')

          if (!existsSync(libFolder)) {
            if (root !== entryRoot) {
              libFolder = resolve(entryRoot, 'node_modules/typescript')

              if (!existsSync(libFolder)) libFolder = undefined
            }

            libFolder = undefined
          }

          const rollupFiles = new Set<string>()

          if (multiple) {
            for (const name of entryNames) {
              const path = resolve(outDir, `${name.replace(tsRE, '')}.d.ts`)

              rollupDeclarationFiles({
                root,
                configPath,
                compilerOptions: rawCompilerOptions,
                outDir,
                entryPath: path,
                fileName: basename(path),
                libFolder,
                rollupConfig,
                rollupOptions
              })

              emittedFiles.delete(path)
              rollupFiles.add(path)
            }
          } else {
            rollupDeclarationFiles({
              root,
              configPath,
              compilerOptions: rawCompilerOptions,
              outDir,
              entryPath: typesPath,
              fileName: basename(typesPath),
              libFolder,
              rollupConfig,
              rollupOptions
            })

            emittedFiles.delete(typesPath)
            rollupFiles.add(typesPath)
          }

          await runParallel(cpus().length, Array.from(emittedFiles.keys()), f => unlink(f))
          removeDirIfEmpty(outDir)
          emittedFiles.clear()

          for (const file of rollupFiles) {
            emittedFiles.set(file, await readFile(file, 'utf-8'))
          }

          bundleDebug('rollup output')
        }
      }

      if (outDirs.length > 1) {
        const extraOutDirs = outDirs.slice(1)

        await runParallel(cpus().length, Array.from(emittedFiles), async ([wroteFile, content]) => {
          const relativePath = relative(outDir, wroteFile)

          await Promise.all(
            extraOutDirs.map(async targetOutDir => {
              const path = resolve(targetOutDir, relativePath)

              if (wroteFile.endsWith('.map')) {
                const relativeOutDir = relative(outDir, targetOutDir)

                if (relativeOutDir) {
                  try {
                    const sourceMap: { sources: string[] } = JSON.parse(content)

                    sourceMap.sources = sourceMap.sources.map(source => {
                      return normalizePath(relative(relativeOutDir, source))
                    })
                    content = JSON.stringify(sourceMap)
                  } catch (e) {
                    logger.warn(`${logPrefix} ${yellow('Processing source map fail:')} ${path}`)
                  }
                }
              }

              await writeOutput(path, content, targetOutDir, false)
            })
          )
        })
      }

      if (typeof afterBuild === 'function') {
        await wrapPromise(afterBuild())
      }

      bundleDebug('finish')
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

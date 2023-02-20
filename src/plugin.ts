import { resolve, dirname, relative, basename } from 'node:path'
import fs from 'fs-extra'
import os from 'os'
import { cyan, yellow, red, green } from 'kolorist'
import glob from 'fast-glob'
import debug from 'debug'
import { Project } from 'ts-morph'
import { createLogger, normalizePath } from 'vite'
import typescript from 'typescript'
import { createFilter } from '@rollup/pluginutils'
import {
  normalizeGlob,
  transformDynamicImport,
  transformAliasImport,
  removePureImport
} from './transform'
import { setCompileRoot, compileVueCode } from './compile'
import { rollupDeclarationFiles } from './rollup'
import {
  isNativeObj,
  isPromise,
  isRegExp,
  mergeObjects,
  ensureAbsolute,
  ensureArray,
  runParallel,
  queryPublicPath,
  removeDirIfEmpty
} from './utils'

import type { Alias, Logger } from 'vite'
import type { SourceFile, CompilerOptions } from 'ts-morph'
import type { PluginOptions } from './types'

const noneExport = 'export {};\n'
const vueRE = /\.vue$/
const tsRE = /\.(m|c)?tsx?$/
const jsRE = /\.(m|c)?jsx?$/
const dtsRE = /\.d\.(m|c)?tsx?$/
const tjsRE = /\.(m|c)?(t|j)sx?$/
const mtjsRE = /\.m(t|j)sx?$/
const ctjsRE = /\.c(t|j)sx?$/
const watchExtensionRE = /\.(vue|(m|c)?(t|j)sx?)$/
const fullRelativeRE = /^\.\.?\//
const defaultIndex = 'index.d.ts'
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}
const extPrefix = (file: string) => (mtjsRE.test(file) ? 'm' : ctjsRE.test(file) ? 'c' : '')

const logPrefix = cyan('[vite:dts]')
const bundleDebug = debug('vite-plugin-dts:bundle')

export function dtsPlugin(options: PluginOptions = {}): import('vite').Plugin {
  const {
    tsConfigFilePath = 'tsconfig.json',
    aliasesExclude = [],
    cleanVueFileName = false,
    staticImport = false,
    clearPureImport = true,
    insertTypesEntry = false,
    rollupTypes = false,
    noEmitOnError = false,
    skipDiagnostics = false,
    logDiagnostics = undefined,
    copyDtsFiles = true,
    logLevel = undefined,
    afterDiagnostic = noop,
    beforeWriteFile = noop,
    afterBuild = noop
  } = options

  let compilerOptions = options.compilerOptions ?? {}

  let root: string
  let entryRoot = options.entryRoot ?? ''
  let libName: string
  let indexName: string
  let aliases: Alias[]
  let entries: Record<string, string>
  let logger: Logger
  let project: Project
  let tsConfigPath: string
  let outputDirs: string[]
  let isBundle = false
  let include: string[]
  let exclude: string[]
  let filter: (id: unknown) => boolean
  let libFolderPath = options.libFolderPath

  const sourceDtsFiles = new Set<SourceFile>()
  const emittedFiles = new Map<string, string>()

  let hasJsVue = false
  let allowJs = false
  let transformError = false

  function internalTransform(code: string, id: string) {
    if (!filter(id)) {
      return
    }

    if (vueRE.test(id)) {
      const { error, content, ext } = compileVueCode(code)

      if (!transformError && error) {
        logger.error(
          red(
            `\n${cyan(
              '[vite:dts]'
            )} A error occurred when transform code, maybe there are some inertnal bugs.\n`
          )
        )

        transformError = true
      }

      if (content) {
        if (ext === 'js' || ext === 'jsx') hasJsVue = true

        project.createSourceFile(`${id}.${ext || 'js'}`, content, { overwrite: true })
      }
    } else if (!id.includes('.vue?vue') && (tsRE.test(id) || (allowJs && jsRE.test(id)))) {
      project.createSourceFile(id, code, { overwrite: true })
    }
  }

  return {
    name: 'vite:dts',

    apply: 'build',

    enforce: 'pre',

    config(config) {
      if (isBundle) return

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
              alias =>
                alias &&
                (isRegExp(find)
                  ? find.toString() === alias.toString()
                  : isRegExp(alias)
                    ? find.match(alias)?.[0]
                    : find === alias)
            )
        )
      }
    },

    configResolved(config) {
      if (isBundle) return

      logger = logLevel
        ? createLogger(logLevel, { allowClearScreen: config.clearScreen })
        : config.logger

      if (logDiagnostics != null) {
        logger.warn(
          yellow(
            `\n${cyan(
              '[vite:dts]'
            )} 'logDiagnostics' has been deprecated, the original feature now following 'skipDiagnostics'.\n`
          )
        )
      }

      if (!config.build.lib) {
        logger.warn(
          yellow(
            `\n${cyan(
              '[vite:dts]'
            )} You building not a library that may not need to generate declaration files.\n`
          )
        )

        libName = '_default'
        indexName = defaultIndex
      } else {
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
      }

      root = ensureAbsolute(options.root ?? '', config.root)
      tsConfigPath = ensureAbsolute(tsConfigFilePath, root)
      libFolderPath = libFolderPath && ensureAbsolute(libFolderPath, root)

      outputDirs = options.outputDir
        ? ensureArray(options.outputDir).map(d => ensureAbsolute(d, root))
        : [ensureAbsolute(config.build.outDir, root)]

      if (!outputDirs[0]) {
        logger.error(
          red(
            `\n${cyan(
              '[vite:dts]'
            )} Can not resolve declaration directory, please check your vite config and plugin options.\n`
          )
        )

        return
      }

      setCompileRoot(root)

      project = new Project({
        compilerOptions: mergeObjects(compilerOptions, {
          rootDir: compilerOptions.rootDir || root,
          noEmitOnError,
          outDir: '.',
          // #27 declarationDir option will make no declaration file generated
          declarationDir: undefined,
          // compile vue setup script will generate expose parameter for setup function
          // although user never use it which will get an unexpected unused error
          noUnusedParameters: false,
          declaration: true,
          noEmit: false,
          emitDeclarationOnly: true,
          // #153 maybe a bug of ts-morph
          composite: false
        } as CompilerOptions),
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: true,
        libFolderPath
      })

      allowJs = project.getCompilerOptions().allowJs ?? false

      const tsConfig: {
        compilerOptions: CompilerOptions,
        include?: string[],
        exclude?: string[]
      } = { compilerOptions: {} }
      const readFile = project.getFileSystem().readFileSync

      let currentConfigPath: string | undefined = tsConfigPath

      // #95 Should parse include or exclude from the base config when they are missing from
      // the inheriting config. If the inherit config doesn't have `include` or `exclude` field,
      // should get them from the parent config.
      while (currentConfigPath) {
        const currentConfig: any =
          typescript.readConfigFile(currentConfigPath, readFile).config ?? {}

        // #171 Need to collect the full `compilerOptions` for `@microsoft/api-extractor`
        Object.assign(tsConfig.compilerOptions, currentConfig.compilerOptions || {})

        if (!tsConfig.include) {
          tsConfig.include = currentConfig.include
        }

        if (!tsConfig.exclude) {
          tsConfig.exclude = currentConfig.exclude
        }

        currentConfigPath = currentConfig.extends
      }

      include = ensureArray(options.include ?? tsConfig.include ?? '**/*').map(normalizeGlob)
      exclude = ensureArray(options.exclude ?? tsConfig.exclude ?? 'node_modules/**').map(
        normalizeGlob
      )
      filter = createFilter(include, exclude, { resolve: root })
      compilerOptions = tsConfig.compilerOptions
    },

    buildStart(inputOptions) {
      if (Array.isArray(inputOptions.input)) {
        entries = inputOptions.input.reduce((prev, current) => {
          prev[basename(current)] = current

          return prev
        }, {} as Record<string, string>)
      } else {
        entries = { ...inputOptions.input }
      }
    },

    transform(code, id) {
      internalTransform(code, id)
      return null
    },

    async watchChange(id) {
      if (watchExtensionRE.test(id)) {
        isBundle = false

        if (project) {
          const sourceFile = project.getSourceFile(normalizePath(id))

          sourceFile && project.removeSourceFile(sourceFile)
          internalTransform(await fs.readFile(id, 'utf-8'), id)
        }
      }
    },

    async closeBundle() {
      if (!outputDirs || !project || isBundle) return

      logger.info(green(`\n${logPrefix} Start generate declaration files...`))
      bundleDebug('start')

      isBundle = true

      sourceDtsFiles.clear()
      emittedFiles.clear()

      const startTime = Date.now()
      const includedFileSet = new Set<string>()

      if (include && include.length) {
        const files = await glob(include, {
          cwd: root,
          absolute: true,
          ignore: exclude
        })

        files.forEach(file => {
          if (dtsRE.test(file)) {
            sourceDtsFiles.add(project.addSourceFileAtPath(file))

            if (!copyDtsFiles) {
              return
            }

            includedFileSet.add(file)
            return
          }

          includedFileSet.add(`${file.replace(tjsRE, '')}.d.${extPrefix(file)}ts`)
        })

        if (hasJsVue) {
          if (!allowJs) {
            logger.warn(
              yellow(
                `${cyan(
                  '[vite:dts]'
                )} Some js files are referenced, but you may not enable the 'allowJs' option.`
              )
            )
          }

          project.compilerOptions.set({ allowJs: true })
        }

        bundleDebug('collect files')
      }

      project.resolveSourceFileDependencies()
      bundleDebug('resolve')

      if (!skipDiagnostics) {
        const diagnostics = project.getPreEmitDiagnostics()

        if (diagnostics?.length) {
          logger.warn(project.formatDiagnosticsWithColorAndContext(diagnostics))
        }

        if (typeof afterDiagnostic === 'function') {
          const result = afterDiagnostic(diagnostics)

          isPromise(result) && (await result)
        }

        bundleDebug('diagnostics')
      }

      const dtsOutputFiles = Array.from(sourceDtsFiles).map(sourceFile => ({
        path: sourceFile.getFilePath(),
        content: sourceFile.getFullText()
      }))

      const service = project.getLanguageService()
      const outputFiles = project
        .getSourceFiles()
        .map(sourceFile =>
          service
            .getEmitOutput(sourceFile, true)
            .getOutputFiles()
            .map(outputFile => ({
              path: normalizePath(resolve(root, outputFile.compilerObject.name)),
              content: outputFile.getText()
            }))
        )
        .flat()
        .concat(dtsOutputFiles)

      bundleDebug('emit')

      if (!entryRoot) {
        entryRoot = queryPublicPath(outputFiles.map(file => file.path))
      }

      entryRoot = ensureAbsolute(entryRoot, root)

      // const wroteFiles = new Set<string>()
      const outputDir = outputDirs[0]

      await runParallel(os.cpus().length, outputFiles, async outputFile => {
        let filePath = outputFile.path
        let content = outputFile.content

        const isMapFile = filePath.endsWith('.map')

        if (
          !includedFileSet.has(isMapFile ? filePath.slice(0, -4) : filePath) ||
          (clearPureImport && content === noneExport)
        ) {
          return
        }

        if (!isMapFile && content && content !== noneExport) {
          content = clearPureImport ? removePureImport(content) : content
          content = transformAliasImport(filePath, content, aliases, aliasesExclude)
          content = staticImport || rollupTypes ? transformDynamicImport(content) : content
        }

        filePath = resolve(
          outputDir,
          relative(entryRoot, cleanVueFileName ? filePath.replace('.vue.d.ts', '.d.ts') : filePath)
        )

        if (typeof beforeWriteFile === 'function') {
          const result = beforeWriteFile(filePath, content)

          // #110 skip if return false
          if (result === false) return

          if (result && isNativeObj(result)) {
            filePath = result.filePath ?? filePath
            content = result.content ?? content
          }
        }

        await fs.mkdir(dirname(filePath), { recursive: true })
        await fs.writeFile(
          filePath,
          cleanVueFileName ? content.replace(/['"](.+)\.vue['"]/g, '"$1"') : content,
          'utf-8'
        )

        emittedFiles.set(
          normalizePath(filePath),
          cleanVueFileName ? content.replace(/['"](.+)\.vue['"]/g, '"$1"') : content
        )
      })

      bundleDebug('output')

      if (insertTypesEntry || rollupTypes) {
        const pkgPath = resolve(root, 'package.json')
        const pkg = fs.existsSync(pkgPath) ? JSON.parse(await fs.readFile(pkgPath, 'utf-8')) : {}
        const entryNames = Object.keys(entries)
        const types =
          pkg.types || pkg.typings || pkg.publishConfig?.types || pkg.publishConfig?.typings
        const multiple = entryNames.length > 1

        const typesPath = types ? resolve(root, types) : resolve(outputDir, indexName)

        for (const name of entryNames) {
          let filePath = multiple ? resolve(outputDir, `${name.replace(tsRE, '')}.d.ts`) : typesPath

          if (fs.existsSync(filePath)) continue

          const index = resolve(
            outputDir,
            relative(entryRoot, `${entries[name].replace(tsRE, '')}.d.ts`)
          )

          let fromPath = normalizePath(relative(dirname(filePath), index))

          fromPath = fromPath.replace(dtsRE, '')
          fromPath = fullRelativeRE.test(fromPath) ? fromPath : `./${fromPath}`

          let content = `export * from '${fromPath}'\n`

          if (fs.existsSync(index)) {
            const entryCodes = await fs.readFile(index, 'utf-8')

            if (entryCodes.includes('export default')) {
              content += `import ${libName} from '${fromPath}'\nexport default ${libName}\n`
            }
          }

          let result: ReturnType<typeof beforeWriteFile>

          if (typeof beforeWriteFile === 'function') {
            result = beforeWriteFile(filePath, content)

            if (result && isNativeObj(result)) {
              filePath = result.filePath ?? filePath
              content = result.content ?? content
            }
          }

          if (result !== false) {
            await fs.writeFile(filePath, content, 'utf-8')
            emittedFiles.set(normalizePath(filePath), content)
          }
        }

        bundleDebug('insert index')

        if (rollupTypes) {
          logger.info(green(`${logPrefix} Start rollup declaration files...`))

          const rollupFiles = new Set<string>()

          for (const [filePath, content] of emittedFiles) {
            project.createSourceFile(filePath, content, { overwrite: true })
          }

          if (multiple) {
            for (const name of entryNames) {
              const path = resolve(outputDir, `${name.replace(tsRE, '')}.d.ts`)

              rollupDeclarationFiles({
                root,
                // tsConfigPath,
                compilerOptions,
                outputDir,
                entryPath: path,
                fileName: basename(path),
                libFolder: libFolderPath
              })

              const wroteFile = normalizePath(path)

              emittedFiles.delete(wroteFile)
              rollupFiles.add(wroteFile)
            }
          } else {
            rollupDeclarationFiles({
              root,
              // tsConfigPath,
              compilerOptions,
              outputDir,
              entryPath: typesPath,
              fileName: basename(typesPath),
              libFolder: libFolderPath
            })

            const wroteFile = normalizePath(typesPath)

            emittedFiles.delete(wroteFile)
            rollupFiles.add(wroteFile)
          }

          await runParallel(os.cpus().length, Array.from(emittedFiles.keys()), f => fs.unlink(f))
          removeDirIfEmpty(outputDir)
          emittedFiles.clear()

          for (const file of rollupFiles) {
            emittedFiles.set(file, await fs.readFile(file, 'utf-8'))
          }

          if (copyDtsFiles) {
            await runParallel(os.cpus().length, dtsOutputFiles, async ({ path, content }) => {
              const filePath = resolve(outputDir, basename(path))

              await fs.writeFile(filePath, content, 'utf-8')
              emittedFiles.set(normalizePath(filePath), content)
            })
          }

          bundleDebug('rollup')
        }
      }

      if (outputDirs.length > 1) {
        const dirs = outputDirs.slice(1)

        await runParallel(
          os.cpus().length,
          Array.from(emittedFiles),
          async ([wroteFile, content]) => {
            const relativePath = relative(outputDir, wroteFile)
            // const content = await fs.readFile(wroteFile, 'utf-8')

            await Promise.all(
              dirs.map(async dir => {
                const filePath = resolve(dir, relativePath)

                await fs.mkdir(dirname(filePath), { recursive: true })
                await fs.writeFile(filePath, content, 'utf-8')
              })
            )
          }
        )
      }

      if (typeof afterBuild === 'function') {
        const result = afterBuild()

        isPromise(result) && (await result)
      }

      bundleDebug('finish')

      logger.info(green(`${logPrefix} Declaration files built in ${Date.now() - startTime}ms.\n`))
    }
  }
}

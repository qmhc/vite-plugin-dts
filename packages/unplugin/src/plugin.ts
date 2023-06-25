import { resolve as _resolve, dirname, relative, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { writeFile, mkdir, readFile, unlink } from 'node:fs/promises'
import { cpus } from 'os'
import ts from 'typescript'
import { createUnplugin } from 'unplugin'
import { createFilter } from '@rollup/pluginutils'
import { createParsedCommandLine } from '@vue/language-core'
import { createProgram } from 'vue-tsc'
import debug from 'debug'
import { cyan, yellow, green } from 'kolorist'
import { normalizeGlob, removePureImport, transformDynamicImport } from './transform'
import {
  ensureAbsolute,
  ensureArray,
  isNativeObj,
  normalizePath,
  queryPublicPath,
  removeDirIfEmpty,
  runParallel
} from './utils'

import type { _Program as Program } from 'vue-tsc'
import type { PluginOptions } from './types'
import { rollupDeclarationFiles } from './bundle'

const noneExport = 'export {};\n'
// const vueRE = /\.vue$/
const tsRE = /\.(m|c)?tsx?$/
// const jsRE = /\.(m|c)?jsx?$/
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
  noEmitOnError: undefined
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}
const extPrefix = (file: string) => (mtjsRE.test(file) ? 'm' : ctjsRE.test(file) ? 'c' : '')
const resolve = (...paths: string[]) => normalizePath(_resolve(...paths))

export const dtsPlugin = createUnplugin((options: PluginOptions = {}) => {
  const {
    tsConfigFilePath = '',
    staticImport = false,
    clearPureImport = true,
    cleanVueFileName = false,
    insertTypesEntry = false,
    rollupTypes = false,
    bundledPackages = [],
    beforeWriteFile = noop
  } = options

  let compilerOptions = options.compilerOptions ?? {}
  let root = ensureAbsolute(options.root ?? '', process.cwd())
  let entryRoot = options.entryRoot ?? ''
  let entries: Record<string, string>
  let include: string[]
  let exclude: string[]
  let outDirs: string[]
  let libName: string
  let indexName: string
  let libFolderPath = options.libFolderPath

  let host: ts.CompilerHost
  let program: Program

  function parseTsConfig(
    root: string,
    path?: string,
    override = fixedCompilerOptions
  ): {
    include?: string[],
    exclude?: string[],
    fileNames?: string[],
    raw?: any,
    options: ts.CompilerOptions
  } {
    path = path ? ensureAbsolute(path, root) : ts.findConfigFile(root, ts.sys.fileExists)

    if (!path) {
      return { options: override }
    }

    // const { config, error } = ts.readConfigFile(path, ts.sys.readFile)

    // if (error) {
    //   return { options: override }
    // }

    // const content = ts.parseJsonConfigFileContent(config, ts.sys, root)
    const content = createParsedCommandLine(ts as any, ts.sys, path)

    return {
      include: content.raw.include,
      exclude: content.raw.exclude,
      fileNames: content.fileNames,
      raw: content.raw,
      options: {
        ...content.options,
        ...fixedCompilerOptions
      }
    }
  }

  return {
    name: 'unplugin-dts',

    vite: {
      configResolved(config) {
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
          console.warn(
            yellow(
              `\n${cyan(
                '[vite:dts]'
              )} You are building a library that may not need to generate declaration files.\n`
            )
          )

          libName = '_default'
          indexName = defaultIndex
        }

        if (!options.outDir) {
          outDirs = [ensureAbsolute(config.build.outDir, root)]
        }

        bundleDebug('parse vite config')
      }
    },

    async buildStart() {
      const config = parseTsConfig(root, tsConfigFilePath)

      if (!outDirs) {
        outDirs = options.outDir
          ? ensureArray(options.outDir).map(d => ensureAbsolute(d, root))
          : [ensureAbsolute(config.raw?.compilerOptions?.outDir || 'dist', root)]
      }

      include = ensureArray(options.include ?? config.include ?? '**/*').map(normalizeGlob)
      exclude = ensureArray(options.exclude ?? config.exclude ?? 'node_modules/**').map(
        normalizeGlob
      )
      compilerOptions = { ...config.options, outDir: outDirs[0] }

      host = ts.createCompilerHost(compilerOptions, true)
      program = createProgram({
        rootNames: Object.values(entries),
        options: compilerOptions,
        host
      })

      indexName = indexName || defaultIndex
      libFolderPath = libFolderPath && ensureAbsolute(libFolderPath, root)

      const diagnostics = program.getDeclarationDiagnostics()

      if (diagnostics?.length) {
        console.error(ts.formatDiagnostics(diagnostics, host))
      }

      bundleDebug('create ts program')
    },

    async writeBundle() {
      if (!outDirs || !program) return

      console.info(green(`\n${logPrefix} Start generate declaration files...`))

      const outDir = outDirs[0]
      const emittedFiles = new Map<string, string>()

      const filter = createFilter(include, exclude, { resolve: root })

      const service = program.__vue.languageService
      const sourceFiles = program.getSourceFiles()

      const outputFiles = sourceFiles
        .map(sourceFile => {
          if (!filter(sourceFile.fileName)) return []

          return service.getEmitOutput(sourceFile.fileName, true).outputFiles.map(outputFile => {
            return {
              path: resolve(root, relative(outDir, outputFile.name)),
              content: outputFile.text
            }
          })
        })
        .flat()

      bundleDebug('emit output')

      entryRoot = entryRoot || queryPublicPath(outputFiles.map(file => file.path))
      entryRoot = ensureAbsolute(entryRoot, root)

      await runParallel(cpus().length, outputFiles, async ({ path, content }) => {
        const isMapFile = path.endsWith('.map')

        if (!isMapFile && content && content !== noneExport) {
          content = clearPureImport ? removePureImport(content) : content
          content = staticImport || rollupTypes ? transformDynamicImport(content) : content
        }

        path = resolve(
          outDir,
          relative(entryRoot, cleanVueFileName ? path.replace('.vue.d.ts', '.d.ts') : path)
        )
        content = cleanVueFileName ? content.replace(/['"](.+)\.vue['"]/g, '"$1"') : content

        if (typeof beforeWriteFile === 'function') {
          const result = beforeWriteFile(path, content)

          // #110 skip if return false
          if (result === false) return

          if (result && isNativeObj(result)) {
            path = result.filePath || path
            content = result.content ?? content
          }
        }

        path = normalizePath(path)
        const dir = dirname(path)

        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true })
        }

        await writeFile(path, content, 'utf-8')
        emittedFiles.set(path, content)
      })

      bundleDebug('write output')

      if (insertTypesEntry || rollupTypes) {
        const pkgPath = resolve(root, 'package.json')
        const pkg = existsSync(pkgPath) ? JSON.parse(await readFile(pkgPath, 'utf-8')) : {}
        const entryNames = Object.keys(entries)
        const types =
          pkg.types ||
          pkg.typings ||
          pkg.publishConfig?.types ||
          pkg.publishConfig?.typings ||
          (pkg.exports?.['.'] || pkg.exports?.['./'])?.types
        const multiple = entryNames.length > 1

        const typesPath = types ? resolve(root, types) : resolve(outDir, indexName)

        for (const name of entryNames) {
          let path = multiple ? resolve(outDir, `${name.replace(tsRE, '')}.d.ts`) : typesPath

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

          let result: ReturnType<typeof beforeWriteFile>

          if (typeof beforeWriteFile === 'function') {
            result = beforeWriteFile(path, content)

            if (result && isNativeObj(result)) {
              path = result.filePath ?? path
              content = result.content ?? content
            }
          }

          path = normalizePath(path)

          if (result !== false) {
            await writeFile(path, content, 'utf-8')
            emittedFiles.set(path, content)
          }
        }

        bundleDebug('insert index')

        if (rollupTypes) {
          console.info(green(`${logPrefix} Start rollup declaration files...`))

          const rollupFiles = new Set<string>()

          if (multiple) {
            for (const name of entryNames) {
              const path = resolve(outDir, `${name.replace(tsRE, '')}.d.ts`)

              rollupDeclarationFiles({
                root,
                // tsConfigPath,
                compilerOptions,
                outDir,
                entryPath: path,
                fileName: basename(path),
                libFolder: libFolderPath,
                bundledPackages
              })

              emittedFiles.delete(path)
              rollupFiles.add(path)
            }
          } else {
            rollupDeclarationFiles({
              root,
              // tsConfigPath,
              compilerOptions,
              outDir,
              entryPath: typesPath,
              fileName: basename(typesPath),
              libFolder: libFolderPath,
              bundledPackages
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
        const dirs = outDirs.slice(1)

        await runParallel(cpus().length, Array.from(emittedFiles), async ([wroteFile, content]) => {
          const relativePath = relative(outDir, wroteFile)

          await Promise.all(
            dirs.map(async dir => {
              const path = resolve(dir, relativePath)
              const dirPath = dirname(path)

              if (!existsSync(dirPath)) {
                await mkdir(dirPath, { recursive: true })
              }

              await writeFile(path, content, 'utf-8')
            })
          )
        })
      }

      bundleDebug('finish')
      console.info(green(`${logPrefix} Declaration files built.\n`))
    }
  }
})

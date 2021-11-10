import { resolve, dirname, relative } from 'path'
import fs from 'fs-extra'
import os from 'os'
import chalk from 'chalk'
import glob from 'fast-glob'
import { debug } from 'debug'
import { Project } from 'ts-morph'
import { normalizePath } from 'vite'
import { readConfigFile } from 'typescript'
import {
  normalizeGlob,
  transformDynamicImport,
  transformAliasImport,
  removePureImport
} from './transform'
import { compileVueCode } from './compile'
import {
  isNativeObj,
  isPromise,
  mergeObjects,
  ensureAbsolute,
  ensureArray,
  runParallel
} from './utils'

import type { Plugin, Alias, Logger } from 'vite'
import type { ts, Diagnostic } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string,
  content?: string
}

export interface PluginOptions {
  include?: string | string[],
  exclude?: string | string[],
  root?: string,
  outputDir?: string,
  compilerOptions?: ts.CompilerOptions | null,
  tsConfigFilePath?: string,
  cleanVueFileName?: boolean,
  staticImport?: boolean,
  clearPureImport?: boolean,
  insertTypesEntry?: boolean,
  copyDtsFiles?: boolean,
  noEmitOnError?: boolean,
  skipDiagnostics?: boolean,
  logDiagnostics?: boolean,
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void | Promise<void>,
  beforeWriteFile?: (filePath: string, content: string) => void | TransformWriteFile,
  afterBuild?: () => void | Promise<void>
}

const noneExport = 'export {};\n'
const vueRE = /\.vue$/
const tsRE = /\.tsx?$/
const jsRE = /\.jsx?$/
const dtsRE = /\.d\.tsx?$/
const tjsRE = /\.(t|j)sx?$/
const watchExtensionRE = /\.(vue|(t|j)sx?)$/
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

const bundleDebug = debug('vite-plugin-dts:bundle')

export function dtsPlugin(options: PluginOptions = {}): Plugin {
  const {
    tsConfigFilePath = 'tsconfig.json',
    cleanVueFileName = false,
    staticImport = false,
    clearPureImport = true,
    insertTypesEntry = false,
    noEmitOnError = false,
    skipDiagnostics = true,
    logDiagnostics = false,
    afterDiagnostic = noop,
    beforeWriteFile = noop,
    afterBuild = noop
  } = options

  const compilerOptions = options.compilerOptions ?? {}

  let root: string
  let aliases: Alias[]
  let entries: string[]
  let logger: Logger
  let project: Project
  let tsConfigPath: string
  let outputDir: string
  let isBundle = false

  const sourceDtsFiles = new Set<string>()

  let hasJsVue = false
  let allowJs = false

  return {
    name: 'vite:dts',

    apply: 'build',

    enforce: 'pre',

    config(config) {
      if (isBundle) return

      const aliasOptions = (config.resolve && config.resolve.alias) ?? []

      if (isNativeObj(aliasOptions)) {
        aliases = Object.entries(aliasOptions).map(([key, value]) => {
          return { find: key, replacement: value }
        })
      } else {
        aliases = ensureArray(aliasOptions)
      }
    },

    configResolved(config) {
      if (isBundle) return

      logger = config.logger

      if (!config.build.lib) {
        logger.warn(
          chalk.yellow(
            `\n${chalk.cyan(
              '[vite:dts]'
            )} You building not a library that may not need to generate declaration files.\n`
          )
        )
      }

      root = ensureAbsolute(options.root ?? '', config.root)
      tsConfigPath = ensureAbsolute(tsConfigFilePath, root)

      outputDir = options.outputDir
        ? ensureAbsolute(options.outputDir, root)
        : ensureAbsolute(config.build.outDir, root)

      if (!outputDir) {
        logger.error(
          chalk.red(
            `\n${chalk.cyan(
              '[vite:dts]'
            )} Can not resolve declaration directory, please check your vite config and plugin options.\n`
          )
        )

        return
      }

      compilerOptions.rootDir ||= root

      project = new Project({
        compilerOptions: mergeObjects(compilerOptions, {
          noEmitOnError,
          outDir: '.',
          // #27 declarationDir option will make no declaration file generated
          declarationDir: null,
          // compile vue setup script will generate expose parameter for setup function
          // although user never use it which will get an unexpected unused error
          noUnusedParameters: false,
          declaration: true,
          noEmit: false,
          emitDeclarationOnly: true
        }),
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: true
      })

      allowJs = project.getCompilerOptions().allowJs ?? false
    },

    buildStart(inputOptions) {
      if (insertTypesEntry) {
        entries = Array.isArray(inputOptions.input)
          ? inputOptions.input
          : Object.values(inputOptions.input)
      }
    },

    transform(code, id) {
      if (vueRE.test(id)) {
        const { content, ext } = compileVueCode(code)

        if (content) {
          if (ext === 'js' || ext === 'jsx') hasJsVue = true

          project.createSourceFile(`${id}.${ext || 'js'}`, content, { overwrite: true })
        }
      } else if (!id.includes('.vue?vue') && (tsRE.test(id) || (allowJs && jsRE.test(id)))) {
        project.addSourceFileAtPath(id)
      }

      return null
    },

    watchChange(id) {
      if (watchExtensionRE.test(id)) {
        isBundle = false

        if (project) {
          const sourceFile = project.getSourceFile(normalizePath(id))

          sourceFile && project.removeSourceFile(sourceFile)
        }
      }
    },

    async closeBundle() {
      if (!outputDir || !project || isBundle) return

      logger.info(chalk.green(`\n${chalk.cyan('[vite:dts]')} Start generate declaration files...`))
      bundleDebug('start')

      isBundle = true

      sourceDtsFiles.clear()

      const startTime = Date.now()
      const tsConfig: {
        include?: string[],
        exclude?: string[]
      } = readConfigFile(tsConfigPath, project.getFileSystem().readFileSync).config ?? {}

      const include = options.include ?? tsConfig.include
      const exclude = options.exclude ?? tsConfig.exclude

      bundleDebug('read config')

      const includedFileSet = new Set<string>()

      if (include && include.length) {
        const files = await glob(ensureArray(include).map(normalizeGlob), {
          cwd: root,
          absolute: true,
          ignore: ensureArray(exclude ?? ['node_modules/**']).map(normalizeGlob)
        })

        files.forEach(file => {
          includedFileSet.add(
            dtsRE.test(file) ? file : `${tjsRE.test(file) ? file.replace(tjsRE, '') : file}.d.ts`
          )

          if (dtsRE.test(file)) {
            project.addSourceFileAtPath(file)
            sourceDtsFiles.add(file)
          }
        })

        if (hasJsVue) {
          if (!allowJs) {
            logger.warn(
              chalk.yellow(
                `${chalk.cyan(
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

        if (diagnostics?.length && logDiagnostics) {
          logger.warn(project.formatDiagnosticsWithColorAndContext(diagnostics))
        }

        if (typeof afterDiagnostic === 'function') {
          const result = afterDiagnostic(diagnostics)

          isPromise(result) && (await result)
        }

        bundleDebug('diagnostics')
      }

      const service = project.getLanguageService()
      const outputFiles = project
        .getSourceFiles()
        .map(sourceFile => {
          return service.getEmitOutput(sourceFile, true).getOutputFiles()
        })
        .flat()

      bundleDebug('emit')

      await runParallel(os.cpus().length, outputFiles, async outputFile => {
        let filePath = outputFile.getFilePath() as string
        let content = outputFile.getText()

        const isMapFile = filePath.endsWith('.map')

        if (
          !includedFileSet.has(isMapFile ? filePath.slice(0, -4) : filePath) ||
          (clearPureImport && content === noneExport)
        )
          return

        if (!isMapFile && content !== noneExport) {
          content = clearPureImport ? removePureImport(content) : content
          content = transformAliasImport(filePath, content, aliases)
          content = staticImport ? transformDynamicImport(content) : content
        }

        filePath = resolve(
          outputDir,
          relative(root, cleanVueFileName ? filePath.replace('.vue.d.ts', '.d.ts') : filePath)
        )

        if (typeof beforeWriteFile === 'function') {
          const result = beforeWriteFile(filePath, content)

          if (result && isNativeObj(result)) {
            filePath = result.filePath ?? filePath
            content = result.content ?? content
          }
        }

        await fs.mkdir(dirname(filePath), { recursive: true })
        await fs.writeFile(
          filePath,
          cleanVueFileName ? content.replace(/['"](.+)\.vue['"]/g, '"$1"') : content,
          'utf8'
        )
      })

      bundleDebug('output')

      await Promise.all(
        Array.from(sourceDtsFiles).map(async filePath => {
          const targetPath = resolve(outputDir, relative(root, filePath))

          await fs.mkdir(dirname(targetPath), { recursive: true })
          await fs.copyFile(filePath, targetPath)
        })
      )

      bundleDebug('copy dts')

      if (insertTypesEntry) {
        const pkgPath = resolve(root, 'package.json')
        const pkg = fs.existsSync(pkgPath) ? JSON.parse(await fs.readFile(pkgPath, 'utf-8')) : {}
        const typesPath = pkg.types ? resolve(root, pkg.types) : resolve(outputDir, 'index.d.ts')

        if (!fs.existsSync(typesPath)) {
          const content =
            entries
              .map(entry => {
                let filePath = normalizePath(
                  relative(dirname(typesPath), resolve(outputDir, relative(root, entry)))
                )

                filePath = filePath.replace(tsRE, '')
                filePath = /^\.\.?\//.test(filePath) ? filePath : `./${filePath}`

                return `export * from '${filePath}'`
              })
              .join('\n') + '\n'

          await fs.writeFile(typesPath, content, 'utf-8')
        }

        bundleDebug('insert index')
      }

      if (typeof afterBuild === 'function') {
        const result = afterBuild()

        isPromise(result) && (await result)
      }

      bundleDebug('finish')

      logger.info(
        chalk.green(
          `${chalk.cyan('[vite:dts]')} Declaration files built in ${Date.now() - startTime}ms.\n`
        )
      )
    }
  }
}

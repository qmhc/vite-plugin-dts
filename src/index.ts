import { resolve, dirname, relative } from 'path'
import fs from 'fs-extra'
import os from 'os'
import chalk from 'chalk'
import glob from 'fast-glob'
import { Project } from 'ts-morph'
import { normalizePath } from 'vite'
import {
  normalizeGlob,
  transformDynamicImport,
  transformAliasImport,
  removePureImport,
  transferSetupPosition
} from './transform'
import { isNativeObj, mergeObjects, ensureAbsolute, ensureArray, runParallel } from './utils'

import type { Plugin, Alias, Logger } from 'vite'
import type { ts, SourceFile, Diagnostic } from 'ts-morph'

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
  logDiagnostics?: boolean,
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void,
  beforeWriteFile?: (filePath: string, content: string) => void | TransformWriteFile
}

const noneExport = 'export {};\n'
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}
const exportDefaultClassRE = /(?:(?:^|\n|;)\s*)export\s+default\s+class\s+([\w$]+)/

export default (options: PluginOptions = {}): Plugin => {
  const {
    tsConfigFilePath = 'tsconfig.json',
    cleanVueFileName = false,
    staticImport = false,
    clearPureImport = true,
    insertTypesEntry = false,
    noEmitOnError = false,
    logDiagnostics = false,
    afterDiagnostic = noop,
    beforeWriteFile = noop
  } = options

  const compilerOptions = options.compilerOptions || {}

  let root: string
  let aliases: Alias[]
  let entries: string[]
  let logger: Logger
  let project: Project
  let tsConfigPath: string
  let outputDir: string
  let isBundle = false

  const sourceFiles: SourceFile[] = []
  const sourceDtsFiles: string[] = []

  return {
    name: 'vite:dts',

    apply: 'build',

    enforce: 'pre',

    config(config) {
      if (isBundle) return

      const aliasOptions = (config.resolve && config.resolve.alias) || []

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
            '\n[vite:dts] You building not a library that may not need to generate declaration files.\n'
          )
        )
      }

      root = ensureAbsolute(options.root || '', config.root)
      tsConfigPath = ensureAbsolute(tsConfigFilePath, root)

      outputDir = options.outputDir
        ? ensureAbsolute(options.outputDir, root)
        : ensureAbsolute(config.build.outDir, root)

      if (!outputDir) {
        logger.error(
          chalk.red(
            '\n[vite:dts] Can not resolve declaration directory, please check your vite config and plugin options.\n'
          )
        )

        return
      }

      compilerOptions.rootDir = compilerOptions.rootDir || root

      project = new Project({
        compilerOptions: mergeObjects(compilerOptions || {}, {
          noEmitOnError,
          outDir: '.',
          declaration: true,
          emitDeclarationOnly: true
        }),
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: true
      })
    },

    buildStart(inputOptions) {
      entries = Array.isArray(inputOptions.input)
        ? inputOptions.input
        : Object.values(inputOptions.input)
    },

    async closeBundle() {
      if (!outputDir || !project || isBundle) return

      isBundle = true
      sourceFiles.length = 0
      sourceDtsFiles.length = 0

      const allowJs = project.getCompilerOptions().allowJs
      const tsConfig = JSON.parse(await fs.readFile(tsConfigPath, 'utf-8')) as {
        include?: string[],
        exclude?: string[]
      }

      const include = options.include || tsConfig.include
      const exclude = options.exclude || tsConfig.exclude

      if (include && include.length) {
        const files = await glob(ensureArray(include).map(normalizeGlob), {
          cwd: root,
          absolute: true,
          ignore: ensureArray(exclude || ['node_modules/**']).map(normalizeGlob)
        })

        let index = 1
        let compiler: typeof import('@vue/compiler-sfc')

        const requireCompiler = () => {
          if (!compiler) {
            try {
              compiler = require('@vue/compiler-sfc')
            } catch (e) {
              throw new Error('@vue/compiler-sfc is not present in the dependency tree.\n')
            }
          }

          return compiler
        }

        let hasJs = false

        await Promise.all(
          files.map(async file => {
            if (/\.vue$/.test(file)) {
              const { parse, compileScript, rewriteDefault } = requireCompiler()
              const { descriptor } = parse(await fs.readFile(file, 'utf-8'))
              const { script, scriptSetup } = descriptor

              if (script || scriptSetup) {
                let content = ''
                let isTs = false

                if (scriptSetup) {
                  const compiled = compileScript(descriptor, {
                    id: `${index++}`
                  })

                  const classMatch = compiled.content.match(exportDefaultClassRE)

                  if (classMatch) {
                    content =
                      compiled.content.replace(exportDefaultClassRE, `\nclass $1`) +
                      `\nconst _sfc_main = ${classMatch[1]}`

                    if (/export\s+default/.test(content)) {
                      content = rewriteDefault(compiled.content, `_sfc_main`)
                    }
                  } else {
                    content = rewriteDefault(compiled.content, `_sfc_main`)
                  }

                  // 不断言会影响 setup 的类型推断
                  // content = content.replace(
                  //   '...__default__',
                  //   '...(__default__ as Record<string, unknown>)'
                  // )
                  content = transferSetupPosition(content)
                  content += '\nexport default _sfc_main\n'

                  if (scriptSetup.lang === 'ts') {
                    isTs = true
                  } else if (!scriptSetup.lang || scriptSetup.lang === 'js') {
                    hasJs = true
                  }
                } else if (script && script.content) {
                  content += script.content

                  if (script.lang === 'ts') {
                    isTs = true
                  } else if (!script.lang || script.lang === 'js') {
                    hasJs = true
                  }
                }

                sourceFiles.push(project.createSourceFile(file + (isTs ? '.ts' : '.js'), content))
              }
            } else if (/\.tsx?$/.test(file) || (allowJs && /\.jsx?$/.test(file))) {
              sourceFiles.push(project.addSourceFileAtPath(file))

              if (/\.d.tsx?$/.test(file)) {
                sourceDtsFiles.push(file)
              }
            }
          })
        )

        if (hasJs) {
          if (!allowJs) {
            logger.warn(
              chalk.yellow(
                "\n[vite:dts] Some js files are referenced, but you may not enable the 'allowJs' option.\n"
              )
            )
          }

          project.compilerOptions.set({ allowJs: true })
        }
      }

      const diagnostics = project.getPreEmitDiagnostics()

      if (diagnostics?.length && logDiagnostics) {
        logger.warn(project.formatDiagnosticsWithColorAndContext(diagnostics))
      }

      if (typeof afterDiagnostic === 'function') {
        afterDiagnostic(diagnostics)
      }

      await runParallel(os.cpus().length, project.emitToMemory().getFiles(), async outputFile => {
        let filePath = outputFile.filePath as string
        let content = outputFile.text

        if (clearPureImport && content === noneExport) return

        if (!filePath.endsWith('.map') && content !== noneExport) {
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
            filePath = result.filePath || filePath
            content = result.content || content
          }
        }

        await fs.mkdir(dirname(filePath), { recursive: true })
        await fs.writeFile(
          filePath,
          cleanVueFileName ? content.replace(/['"](.+)\.vue['"]/g, '"$1"') : content,
          'utf8'
        )
      })

      await Promise.all(
        sourceDtsFiles.map(async filePath => {
          const targetPath = resolve(outputDir, relative(root, filePath))

          await fs.mkdir(dirname(targetPath), { recursive: true })
          await fs.copyFile(filePath, targetPath)
        })
      )

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

                filePath = filePath.replace(/\.tsx?$/, '')
                filePath = /^\.\.?\//.test(filePath) ? filePath : `./${filePath}`

                return `export * from '${filePath}'`
              })
              .join('\n') + '\n'

          await fs.writeFile(typesPath, content, 'utf-8')
        }
      }
    }
  }
}

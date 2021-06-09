import { resolve, dirname, relative } from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import glob from 'fast-glob'
import { Project } from 'ts-morph'
import {
  normalizeGlob,
  transformDynamicImport,
  transformAliasImport,
  removePureImport
} from './transform'
import { isNativeObj, mergeObjects, ensureAbsolute, ensureArray } from './utils'

import type { Plugin, Alias } from 'vite'
import type { ts, SourceFile } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string,
  content?: string
}

export interface PluginOptions {
  root?: string,
  outputDir?: string,
  compilerOptions?: ts.CompilerOptions | null,
  tsConfigFilePath?: string,
  cleanVueFileName?: boolean,
  staticImport?: boolean,
  beforeWriteFile?: (filePath: string, content: string) => void | TransformWriteFile
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

export default (options: PluginOptions = {}): Plugin => {
  const {
    tsConfigFilePath = 'tsconfig.json',
    cleanVueFileName = false,
    staticImport = false,
    beforeWriteFile = noop
  } = options

  const compilerOptions = options.compilerOptions ?? {}

  let root: string
  let aliases: Alias[]
  let project: Project
  let tsConfigPath: string
  let isBundle = false

  const sourceFiles: SourceFile[] = []

  return {
    name: 'vite:dts',

    apply: 'build',

    enforce: 'pre',

    config(config) {
      const aliasOptions = config.resolve?.alias ?? []

      if (isNativeObj(aliasOptions)) {
        aliases = Object.entries(aliasOptions).map(([key, value]) => {
          return { find: key, replacement: value }
        })
      } else {
        aliases = ensureArray(aliasOptions)
      }
    },

    configResolved(config) {
      const lib = config?.build?.lib

      if (!lib) {
        console.log(
          chalk.yellow(
            '\n[vite:dts] You building not a library, it may not need to generate declaration files.\n'
          )
        )
      }

      root = ensureAbsolute(options.root ?? '', config.root)
      tsConfigPath = ensureAbsolute(tsConfigFilePath, root)

      compilerOptions.rootDir = compilerOptions.rootDir ?? root

      project = new Project({
        compilerOptions: mergeObjects(compilerOptions ?? {}, {
          outDir: '.',
          declaration: true,
          emitDeclarationOnly: true,
          noEmitOnError: true
        }),
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: true
      })
    },

    async generateBundle(outputOptions) {
      if (isBundle) return

      isBundle = true

      const outputDir = options.outputDir ? ensureAbsolute(options.outputDir, root) : ''
      const declarationDir =
        outputDir ||
        ((outputOptions.file ? dirname(outputOptions.file) : outputOptions.dir) as string)

      if (!declarationDir) {
        console.log(
          chalk.red(
            '\n[vite:dts] Can not resolve declaration directory, please check your vite config and plugin options.\n'
          )
        )

        return
      }

      const tsConfig = JSON.parse(await fs.readFile(tsConfigPath, 'utf-8')) as {
        include?: string[],
        exclude?: string[]
      }

      if (tsConfig.include?.length) {
        const files = await glob(tsConfig.include.map(normalizeGlob), {
          cwd: root,
          absolute: true,
          ignore: (tsConfig.exclude ?? ['node_modules/**']).map(normalizeGlob)
        })

        let index = 1
        let compiler: typeof import('@vue/compiler-sfc')

        const requireCompiler = () => {
          if (!compiler) {
            try {
              compiler = require(resolve('node_modules/@vue/compiler-sfc'))
            } catch (e) {
              throw new Error('@vue/compiler-sfc is not present in the dependency tree.\n')
            }
          }

          return compiler
        }

        await Promise.all(
          files.map(async file => {
            if (/\.vue$/.test(file)) {
              const { parse, compileScript } = requireCompiler()
              const sfc = parse(await fs.readFile(file, 'utf-8'))
              const { script, scriptSetup } = sfc.descriptor

              if (script || scriptSetup) {
                let content = ''
                let isTs = false

                if (script && script.content) {
                  content += script.content

                  if (script.lang === 'ts') isTs = true
                }

                if (scriptSetup) {
                  const compiled = compileScript(sfc.descriptor, {
                    id: `${index++}`
                  })

                  content += compiled.content

                  if (scriptSetup.lang === 'ts') isTs = true
                }

                sourceFiles.push(project.createSourceFile(file + (isTs ? '.ts' : '.js'), content))
              }
            } else if (/\.tsx?/.test(file)) {
              sourceFiles.push(project.addSourceFileAtPath(file))
            }
          })
        )
      }

      const diagnostics = project.getPreEmitDiagnostics()

      console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

      project.emitToMemory()

      for (const sourceFile of sourceFiles) {
        const emitOutput = sourceFile.getEmitOutput({ emitOnlyDtsFiles: true })

        for (const outputFile of emitOutput.getOutputFiles()) {
          let filePath = outputFile.getFilePath() as string
          let content = removePureImport(outputFile.getText())

          content = transformAliasImport(filePath, content, aliases)
          content = staticImport ? transformDynamicImport(content) : content

          filePath = resolve(
            declarationDir,
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
        }
      }
    }
  }
}

import { resolve, dirname, relative, isAbsolute } from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import { createFilter } from '@rollup/pluginutils'
import { normalizePath } from 'vite'
import { Project } from 'ts-morph'
import { isNativeObj, isRegExp, mergeObjects, ensureAbsolute, ensureArray } from './utils'

import type { Plugin, Alias } from 'vite'
// import type { ExternalOption } from 'rollup'
import type { ts, SourceFile } from 'ts-morph'

type FilterType = string | RegExp | (string | RegExp)[] | null | undefined

interface TransformWriteFile {
  filePath?: string,
  content?: string
}

export interface PluginOptions {
  include?: FilterType,
  exclude?: FilterType,
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
    include = ['**/*.vue', '**/*.ts', '**/*.tsx'],
    exclude = 'node_modules/**',
    compilerOptions = null,
    tsConfigFilePath = 'tsconfig.json',
    cleanVueFileName = false,
    staticImport = false,
    beforeWriteFile = noop
  } = options

  const filter = createFilter(include, exclude)

  let root: string
  // const outputDir = options.outputDir ? ensureAbsolute(options.outputDir, root) : ''

  // let external: ExternalOption | undefined
  let entry: string
  let aliases: Alias[]

  let project: Project

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
      // external = config?.build?.rollupOptions?.external ?? undefined
      const lib = config?.build?.lib

      if (lib) {
        entry = lib.entry
      } else {
        const input = config?.build?.rollupOptions?.input

        if (typeof input !== 'string') {
          console.log(
            chalk.yellow(
              '\n[vite:dts] You may have multiple entries, it will make difficult to calculate relative paths.\n'
            )
          )
        }

        entry = typeof input === 'string' ? input : ''
      }

      entry = ensureAbsolute(entry && dirname(entry), root)
      root = ensureAbsolute(options.root ?? '', config.root)

      project = new Project({
        compilerOptions: mergeObjects(compilerOptions ?? {}, {
          outDir: '.',
          declaration: true,
          emitDeclarationOnly: true,
          noEmitOnError: true
        }),
        tsConfigFilePath: ensureAbsolute(tsConfigFilePath, root),
        skipAddingFilesFromTsConfig: true
      })
    },

    transform(code, id) {
      if (!code || !filter(id)) return null

      if (/\.vue(\?.*type=script.*)$/.test(id)) {
        const filePath = resolve(root, normalizePath(id.split('?')[0]))

        sourceFiles.push(
          project.createSourceFile(filePath + (/lang.ts/.test(id) ? '.ts' : '.js'), code)
        )
      } else if (/\.tsx?$/.test(id)) {
        const filePath = resolve(root, normalizePath(id))

        sourceFiles.push(project.addSourceFileAtPath(filePath))
      }
    },

    async generateBundle(outputOptions) {
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

      const diagnostics = project.getPreEmitDiagnostics()

      console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

      project.emitToMemory()

      for (const sourceFile of sourceFiles) {
        const emitOutput = sourceFile.getEmitOutput({ emitOnlyDtsFiles: true })

        for (const outputFile of emitOutput.getOutputFiles()) {
          let filePath = outputFile.getFilePath() as string
          let content = transformAliasImport(outputFile.getText(), aliases, entry)

          content = staticImport ? transformDynamicImport(content) : content

          filePath = resolve(
            declarationDir,
            relative(entry, cleanVueFileName ? filePath.replace('.vue.d.ts', '.d.ts') : filePath)
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

function transformDynamicImport(content: string) {
  const importMap = new Map<string, Set<string>>()

  content = content.replace(/import\(['"][a-zA-Z0-9]+['"]\)\.[a-zA-Z0-9]+[<,;\n\s]/g, str => {
    const matchResult = str.match(/import\(['"](.+)['"]\)\.(.+)([<,;\n\s])/)!
    const libName = matchResult[1]
    const importSet =
      importMap.get(libName) ?? importMap.set(libName, new Set<string>()).get(libName)!
    const usedType = matchResult[2]

    importSet.add(usedType)

    return usedType + matchResult[3]
  })

  importMap.forEach((importSet, libName) => {
    const importReg = new RegExp(
      `import\\s?(?:type)?\\s?\\{.+\\}\\s?from\\s?['"]${libName}['"]`,
      'g'
    )
    const matchResult = content.match(importReg)

    if (matchResult?.[0]) {
      const importedTypes = matchResult[0]
        .match(/import\s?(?:type)?\s?\{(.+)\}\s?from\s?['"].+['"]/)![1]
        .trim()
        .split(',')

      content = content.replace(
        matchResult[0],
        `import type { ${Array.from(importSet)
          .concat(importedTypes)
          .join(', ')} } from '${libName}'`
      )
    } else {
      content = `import type { ${Array.from(importSet).join(', ')} } from '${libName}';\n` + content
    }
  })

  return content
}

function isAliasMatch(alias: Alias, importee: string) {
  if (isRegExp(alias.find)) return alias.find.test(importee)
  if (importee.length < alias.find.length) return false
  if (importee === alias.find) return true

  return importee.indexOf(alias.find) === 0 && importee.substring(alias.find.length)[0] === '/'
}

function transformAliasImport(content: string, aliases: Alias[], entry: string) {
  if (!aliases.length) return content

  return content.replace(/(?:import|export)\s?(?:type)?\s?\{.+\}\s?from\s?['"].+['"]/g, str => {
    const matchResult = str.match(/(?:import|export)\s?(?:type)?\s?\{.+\}\s?from\s?['"](.+)['"]/)

    if (matchResult?.[1]) {
      const matchedAlias = aliases.find(alias => isAliasMatch(alias, matchResult[1]))

      if (matchedAlias) {
        return str.replace(
          /((?:import|export).+from\s?)['"](.+)['"]/,
          `$1'${matchResult[1].replace(
            matchedAlias.find,
            isAbsolute(matchedAlias.replacement)
              ? normalizePath(relative(entry, matchedAlias.replacement))
              : normalizePath(matchedAlias.replacement)
          )}'`
        )
      }
    }

    return str
  })
}

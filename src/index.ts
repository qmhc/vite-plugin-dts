import { resolve, dirname, relative, isAbsolute } from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import { createFilter } from '@rollup/pluginutils'
import { normalizePath } from 'vite'
import { Project } from 'ts-morph'
import { isNativeObj, isRegExp, mergeObjects, ensureAbsolute, ensureArray } from './utils'

import type { Plugin, Alias } from 'vite'
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
  let aliases: Alias[]
  let project: Project

  const sourceFiles: SourceFile[] = []
  const typeImports = new Set<string>()

  async function collectTypeImports(code: string, importer: string) {
    const matchResult = code.match(
      /(?:import|export)\stype\s?\{[\s\w]+\}\s?from\s?['"][~@\w=:?&-.\\/]+['"]/g
    )

    if (matchResult?.length) {
      await Promise.all(
        matchResult.map(async matched => {
          let fromPath = matched.match(/from ['"](.+)['"]/)![1]

          const matchedAlias = aliases.find(alias => isAliasMatch(alias, fromPath))

          if (matchedAlias) {
            fromPath = fromPath.replace(matchedAlias.find, matchedAlias.replacement)
          }

          if (fromPath.startsWith('.')) {
            fromPath = normalizePath(
              isAbsolute(fromPath) ? fromPath : resolve(dirname(importer), fromPath)
            )

            try {
              if ((await fs.stat(fromPath)).isDirectory()) {
                fromPath += 'index.ts'
              }
              // eslint-disable-next-line no-empty
            } catch (e) {}

            typeImports.add(fromPath + (fromPath.endsWith('.ts') ? '' : '.ts'))
          }
        })
      )
    }

    return []
  }

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

    async transform(code, id) {
      if (!code || !filter(id)) return null

      if (/\.vue(\?.*type=script.*)$/.test(id)) {
        const filePath = resolve(root, normalizePath(id.split('?')[0]))

        sourceFiles.push(
          project.createSourceFile(filePath + (/lang.ts/.test(id) ? '.ts' : '.js'), code)
        )
      } else if (/\.tsx?$/.test(id)) {
        const filePath = resolve(root, normalizePath(id))

        await collectTypeImports(code, id)
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

      typeImports.forEach(filePath => {
        if (!project.getSourceFile(filePath)) {
          sourceFiles.push(project.addSourceFileAtPath(filePath))
        }
      })

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

function transformDynamicImport(content: string) {
  const importMap = new Map<string, Set<string>>()

  content = content.replace(/import\(['"][~@\w=:?&-.\\/]+?['"]\)\.\w+[<,;\n\s]/g, str => {
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

function transformAliasImport(filePath: string, content: string, aliases: Alias[]) {
  if (!aliases.length) return content

  return content.replace(
    /(?:import|export)\s?(?:type)?\s?\{[\s\w]+\}\s?from\s?['"][~@\w=:?&-.\\/]+['"]/g,
    str => {
      const matchResult = str.match(/(?:import|export)\s?(?:type)?\s?\{.+\}\s?from\s?['"](.+)['"]/)

      if (matchResult?.[1]) {
        const matchedAlias = aliases.find(alias => isAliasMatch(alias, matchResult[1]))

        if (matchedAlias) {
          return str.replace(
            /((?:import|export).+from\s?)['"](.+)['"]/,
            `$1'${matchResult[1].replace(
              matchedAlias.find,
              isAbsolute(matchedAlias.replacement)
                ? normalizePath(relative(dirname(filePath), matchedAlias.replacement))
                : normalizePath(matchedAlias.replacement)
            )}'`
          )
        }
      }

      return str
    }
  )
}

function removePureImport(content: string) {
  return content.replace(/import\s?['"][\w=:?&-.\\/]+?['"];?\n?/g, '')
}

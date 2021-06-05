import { resolve, dirname, relative } from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import { createFilter } from '@rollup/pluginutils'
import { normalizePath } from 'vite'
import { Project } from 'ts-morph'
import { isNativeObj, mergeObjects, ensureAbsolute } from './utils'

import type { Plugin } from 'vite'
// import type { ExternalOption } from 'rollup'
import type { ProjectOptions, SourceFile } from 'ts-morph'

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
  projectOptions?: ProjectOptions | null,
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
    // root = process.cwd(),
    projectOptions = null,
    cleanVueFileName = false,
    staticImport = false,
    beforeWriteFile = noop
  } = options

  const root = ensureAbsolute(options.root ?? '', process.cwd())
  const outputDir = options.outputDir ? ensureAbsolute(options.outputDir, root) : ''
  const filter = createFilter(include, exclude)

  const sourceFiles: SourceFile[] = []

  // let external: ExternalOption | undefined
  let entry: string

  const project = new Project(
    mergeObjects(
      {
        compilerOptions: {
          declaration: true,
          emitDeclarationOnly: true,
          noEmitOnError: true
        },
        tsConfigFilePath: resolve(root, 'tsconfig.json'),
        skipAddingFilesFromTsConfig: true
      },
      projectOptions ?? {}
    )
  )

  return {
    name: 'vite:dts',

    apply: 'build',

    enforce: 'post',

    configResolved(resolvedConfig) {
      // external = resolvedConfig?.build?.rollupOptions?.external ?? undefined
      const lib = resolvedConfig?.build?.lib

      if (lib) {
        entry = lib.entry
      } else {
        const input = resolvedConfig?.build?.rollupOptions?.input

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
        const emitOutput = sourceFile.getEmitOutput()

        for (const outputFile of emitOutput.getOutputFiles()) {
          let filePath = outputFile.getFilePath() as string
          let content = staticImport
            ? transformDynamicImport(outputFile.getText())
            : outputFile.getText()

          filePath = resolve(
            declarationDir,
            relative(entry, cleanVueFileName ? filePath.replace('.vue.d.ts', '.d.ts') : filePath)
          )

          if (typeof beforeWriteFile === 'function') {
            const result = beforeWriteFile(filePath, content)

            if (isNativeObj(result)) {
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

const dynamicImportReg = /import\(['"][a-zA-Z0-9]+['"]\)\.[a-zA-Z0-9]+[<,;\n\s]/g

function transformDynamicImport(content: string) {
  const importMap = new Map<string, Set<string>>()

  content = content.replace(dynamicImportReg, str => {
    const match = str.match(/import\(['"](.+)['"]\)\.(.+)([<,;\n\s])/)!
    const libName = match[1]
    const importSet =
      importMap.get(libName) ?? importMap.set(libName, new Set<string>()).get(libName)!
    const usedType = match[2]

    importSet.add(usedType)

    return usedType + match[3]
  })

  importMap.forEach((importSet, libName) => {
    const importReg = new RegExp(
      `import\\s?(?:type)?\\s?\\{.+\\}\\s?from\\s?['"]${libName}['"]`,
      'g'
    )
    const match = content.match(importReg)

    if (match?.[0]) {
      const importedTypes = match[0]
        .match(/import\s?(?:type)?\s?\{(.+)\}\s?from\s?['"]vue['"]/)![1]
        .trim()
        .split(',')

      content = content.replace(
        match[0],
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

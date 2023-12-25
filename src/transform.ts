import { dirname, isAbsolute, relative, resolve } from 'node:path'

import { isRegExp, normalizePath } from './utils'

import type { Alias } from 'vite'

const globSuffixRE = /^((?:.*\.[^.]+)|(?:\*+))$/

export function normalizeGlob(path: string) {
  if (/[\\/]$/.test(path)) {
    return path + '**'
  } else if (!globSuffixRE.test(path.split(/[\\/]/).pop()!)) {
    return path + '/**'
  }

  return path
}

const globalDynamicTypeRE = /import\(['"][^;\n]+?['"]\)\.\w+[.()[\]<>,;\n\s]/g
const dynamicTypeRE = /import\(['"](.+)['"]\)\.(.+)([.()[\]<>,;\n\s])/
const importTypesRE = /import\s?(?:type)?\s?\{(.+)\}\s?from\s?['"].+['"]/

export function transformDynamicImport(content: string) {
  const importMap = new Map<string, Set<string>>()
  const defaultMap = new Map<string, string>()

  let defaultCount = 1

  content = content.replace(globalDynamicTypeRE, str => {
    const matchResult = str.match(dynamicTypeRE)!
    const libName = matchResult[1]
    const importSet =
      importMap.get(libName) ?? importMap.set(libName, new Set<string>()).get(libName)!

    let usedType = matchResult[2]

    if (usedType === 'default') {
      usedType =
        defaultMap.get(libName) ??
        defaultMap.set(libName, `__DTS_${defaultCount++}__`).get(libName)!
      importSet.add(`default as ${usedType}`)
    } else {
      importSet.add(usedType)
    }

    return usedType + matchResult[3]
  })

  importMap.forEach((importSet, libName) => {
    const importReg = new RegExp(
      `import\\s?(?:type)?\\s?\\{[^;\\n]+\\}\\s?from\\s?['"]${libName}['"]`,
      'g'
    )
    const matchResult = content.match(importReg)

    if (matchResult?.[0]) {
      matchResult[0]
        .match(importTypesRE)![1]
        .trim()
        .split(',')
        .forEach(type => {
          type && importSet.add(type.trim())
        })

      content = content.replace(
        matchResult[0],
        `import { ${Array.from(importSet).join(', ')} } from '${libName}'`
      )
    } else {
      content = `import { ${Array.from(importSet).join(', ')} } from '${libName}';\n` + content
    }
  })

  return content
}

function isAliasMatch(alias: Alias, importer: string) {
  if (isRegExp(alias.find)) return alias.find.test(importer)
  if (importer.length < alias.find.length) return false
  if (importer === alias.find) return true

  return (
    importer.indexOf(alias.find) === 0 &&
    (alias.find.endsWith('/') || importer.substring(alias.find.length)[0] === '/')
  )
}

function ensureStartWithDot(path: string) {
  return path.startsWith('.') ? path : `./${path}`
}

const globalImportRE =
  /(?:(?:import|export)\s?(?:type)?\s?(?:(?:\{[^;\n]+\})|(?:[^;\n]+))\s?from\s?['"][^;\n]+['"])|(?:import\(['"][^;\n]+?['"]\))/g
const staticImportRE = /(?:import|export)\s?(?:type)?\s?\{?.+\}?\s?from\s?['"](.+)['"]/
const dynamicImportRE = /import\(['"]([^;\n]+?)['"]\)/
const simpleStaticImportRE = /((?:import|export).+from\s?)['"](.+)['"]/
const simpleDynamicImportRE = /(import\()['"](.+)['"]\)/

export function transformAliasImport(
  filePath: string,
  content: string,
  aliases: Alias[],
  exclude: (string | RegExp)[] = []
) {
  if (!aliases?.length) return content

  return content.replace(globalImportRE, str => {
    let matchResult = str.match(staticImportRE)
    let isDynamic = false

    if (!matchResult) {
      matchResult = str.match(dynamicImportRE)
      isDynamic = true
    }

    if (matchResult?.[1]) {
      const matchedAlias = aliases.find(alias => isAliasMatch(alias, matchResult![1]))

      if (matchedAlias) {
        if (
          exclude.some(e => (isRegExp(e) ? e.test(matchResult![1]) : String(e) === matchResult![1]))
        ) {
          return str
        }

        const dir = dirname(filePath)
        const replacement = isAbsolute(matchedAlias.replacement)
          ? normalizePath(relative(dir, matchedAlias.replacement))
          : normalizePath(matchedAlias.replacement)

        const endSlash = matchResult[1].match(matchedAlias.find)![0].endsWith('/')
        const truthPath = matchResult[1].replace(
          matchedAlias.find,
          replacement + (endSlash ? '/' : '')
        )
        const normalizedPath = normalizePath(relative(dir, resolve(dir, truthPath)))

        // for debug
        // console.log(replacement, truthPath, filePath, resolve(dir, truthPath), normalizedPath)

        return str.replace(
          isDynamic ? simpleDynamicImportRE : simpleStaticImportRE,
          `$1'${ensureStartWithDot(normalizedPath)}'${isDynamic ? ')' : ''}`
        )
      }
    }

    return str
  })
}

const pureImportRE = /import\s?['"][^;\n]+?['"];?\n?/g

export function removePureImport(content: string) {
  return content.replace(pureImportRE, '')
}

const setupFunctionRE = /function setup\([\s\S]+\)\s+?\{[\s\S]+return __returned__\n\}/

export function transferSetupPosition(content: string) {
  const match = content.match(setupFunctionRE)

  if (match) {
    const setupFunction = match[0]

    return content
      .replace(setupFunction, '')
      .replace('setup})', setupFunction.slice('function '.length) + '\n\r})')
  }

  return content
}

const asDefaultRE = /export\s*\{.*\w+\s*\bas\s+default\b.*\}\s*from\s*['"].+['"]/

export function hasExportDefault(content: string) {
  return content.includes('export default') || asDefaultRE.test(content)
}

import { dirname, relative, isAbsolute } from 'path'
import { normalizePath } from 'vite'
import { isRegExp } from './utils'

import type { Alias } from 'vite'

export function normalizeGlob(path: string) {
  if (/[\\/]$/.test(path)) {
    return path + '**'
  } else if (!/[\\/](?:.*\..+)|(?:\*+)$/.test(path)) {
    return path + '/**'
  }

  return path
}

export function transformDynamicImport(content: string) {
  const importMap = new Map<string, Set<string>>()

  content = content.replace(/import\(['"][^;\n]+?['"]\)\.\w+[.()[\]<>,;\n\s]/g, str => {
    const matchResult = str.match(/import\(['"](.+)['"]\)\.(.+)([.()[\]<>,;\n\s])/)!
    const libName = matchResult[1]
    const importSet =
      importMap.get(libName) ?? importMap.set(libName, new Set<string>()).get(libName)!
    const usedType = matchResult[2]

    importSet.add(usedType)

    return usedType + matchResult[3]
  })

  importMap.forEach((importSet, libName) => {
    const importReg = new RegExp(
      `import\\s?(?:type)?\\s?\\{[^;\\n]+\\}\\s?from\\s?['"]${libName}['"]`,
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

export function transformAliasImport(filePath: string, content: string, aliases: Alias[]) {
  if (!aliases.length) return content

  return content.replace(
    /(?:(?:import|export)\s?(?:type)?\s?\{[^;\n]+\}\s?from\s?['"][^;\n]+['"])|(?:import\(['"][^;\n]+?['"]\))/g,
    str => {
      const matchResult =
        str.match(/(?:import|export)\s?(?:type)?\s?\{.+\}\s?from\s?['"](.+)['"]/) ||
        str.match(/import\(['"]([^;\n]+?)['"]\)/)

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

export function removePureImport(content: string) {
  return content.replace(/import\s?['"][\w=:?&-.\\/]+?['"];?\n?/g, '')
}

// export async function collectTypeImports(code: string, importer: string, aliases: Alias[]) {
//   const matchResult = code.match(
//     /(?:import|export)\stype\s?\{[^;\n]+\}\s?from\s?['"][^;\n]+['"]/g
//   )
//   const typeImports: string[] = []

//   if (matchResult?.length) {
//     await Promise.all(
//       matchResult.map(async matched => {
//         let fromPath = matched.match(/from ['"](.+)['"]/)![1]

//         const matchedAlias = aliases.find(alias => isAliasMatch(alias, fromPath))

//         if (matchedAlias) {
//           fromPath = fromPath.replace(matchedAlias.find, matchedAlias.replacement)
//         }

//         if (fromPath.startsWith('.') || isAbsolute(fromPath)) {
//           fromPath = isAbsolute(fromPath) ? fromPath : resolve(dirname(importer), fromPath)

//           try {
//             if ((await fs.stat(fromPath)).isDirectory()) {
//               fromPath = resolve(fromPath, 'index.ts')
//             }
//             // eslint-disable-next-line no-empty
//           } catch (e) {}

//           typeImports.push(normalizePath(fromPath + (fromPath.endsWith('.ts') ? '' : '.ts')))
//         }
//       })
//     )
//   }

//   return typeImports
// }

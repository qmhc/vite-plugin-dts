import MagicString from 'magic-string'
import ts from 'typescript'

function walk(node: ts.SourceFile | ts.Node, callback: (node: ts.Node) => void) {
  if (!ts.isSourceFile(node)) {
    callback(node)
  }

  node.forEachChild(child => walk(child, callback))
}

export function processCode(code: string) {
  const s = new MagicString(code)
  const ast = ts.createSourceFile('a.ts', code, ts.ScriptTarget.Latest)

  // const baseImports = new Map<string, ts.ImportClause>()

  const importMap = new Map<string, Set<string>>()
  const usedDefault = new Map<string, string>()

  let indexCount = 0

  walk(ast, node => {
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause) {
        s.remove(node.pos, node.end)
      } else if (
        ts.isStringLiteral(node.moduleSpecifier) &&
        (node.importClause.name ||
          (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)))
      ) {
        const libName = node.moduleSpecifier.text
        const importSet =
          importMap.get(libName) ?? importMap.set(libName, new Set<string>()).get(libName)!

        if (node.importClause.name && !usedDefault.has(libName)) {
          const usedType = node.importClause.name.escapedText as string

          usedDefault.set(libName, usedType)
          importSet.add(`default as ${usedType}`)
        }

        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach(element => {
            importSet.add(element.name.escapedText as string)
          })
        }

        s.remove(node.pos, node.end)
      }

      return
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.type &&
      ts.isImportTypeNode(node.type) &&
      node.type.qualifier &&
      ts.isLiteralTypeNode(node.type.argument) &&
      ts.isIdentifier(node.type.qualifier) &&
      ts.isStringLiteral(node.type.argument.literal)
    ) {
      const libName = node.type.argument.literal.text
      const importSet =
        importMap.get(libName) ?? importMap.set(libName, new Set<string>()).get(libName)!

      let usedType = node.type.qualifier.escapedText as string

      if (usedType === 'default') {
        usedType =
          usedDefault.get(libName) ??
          usedDefault.set(libName, `__DTS_DEFAULT_${indexCount++}__`).get(libName)!

        importSet.add(`default as ${usedType}`)
      } else {
        importSet.add(usedType)
      }

      s.update(node.type.pos, node.type.end, usedType)
    }
  })

  importMap.forEach((importSet, libName) => {
    s.prepend(`import { ${Array.from(importSet).join(', ')} } from '${libName}'\n`)
  })

  return s.toString()
}

import { createRequire } from 'node:module'
import { parse as babelParse } from '@babel/parser'
import MagicString from 'magic-string'
import { transferSetupPosition } from './transform'

import type { SFCDescriptor, SFCScriptBlock } from 'vue/compiler-sfc'

const noScriptContent = "import { defineComponent } from 'vue'\nexport default defineComponent({})"

const _require = createRequire(import.meta.url)

let index = 1
let compileRoot: string | null = null
let compiler: typeof import('vue/compiler-sfc') | null
let vue: typeof import('vue') | null

function requireCompiler() {
  if (!compiler) {
    if (compileRoot) {
      try {
        compiler = _require(_require.resolve('vue/compiler-sfc', { paths: [compileRoot] }))
      } catch (e) {
        try {
          compiler = _require(_require.resolve('@vue/compiler-sfc', { paths: [compileRoot] }))
        } catch (e) {}
      }
    }

    if (!compiler) {
      try {
        compiler = _require('vue/compiler-sfc')
      } catch (e) {
        try {
          compiler = _require('@vue/compiler-sfc')
        } catch (e) {
          throw new Error('@vue/compiler-sfc is not present in the dependency tree.\n')
        }
      }
    }
  }

  return compiler!
}

function isVue3() {
  if (!vue) {
    if (compileRoot) {
      try {
        vue = _require(_require.resolve('vue', { paths: [compileRoot] }))
      } catch (e) {}
    }

    if (!vue) {
      try {
        vue = _require('vue')
      } catch (e) {
        throw new Error('vue is not present in the dependency tree.\n')
      }
    }
  }

  return vue!.version.startsWith('3')
}

export function setCompileRoot(root: string) {
  if (root && root !== compileRoot) {
    compileRoot = root
    compiler = null
  }
}

function parseCode(code: string) {
  const { parse: parseVueCode } = requireCompiler()
  let descriptor: any

  if (isVue3()) {
    descriptor = parseVueCode(code).descriptor
  } else {
    // #87 support vue 2.7
    descriptor = (parseVueCode as any)({ source: code })
  }

  return descriptor as SFCDescriptor
}

function transformJsToTs(script: SFCScriptBlock | null) {
  if (!script) return script

  const lang =
    !script.lang || script.lang === 'js' ? 'ts' : script.lang === 'jsx' ? 'tsx' : script.lang

  return { ...script, lang }
}

function transformExposed(code: string, hasSetupScript: boolean) {
  const scriptAst = babelParse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'decorators-legacy', 'jsx']
  }).program.body

  const source = new MagicString(code)

  for (const node of scriptAst!) {
    if (node.type === 'ExportDefaultDeclaration') {
      let options

      if (node.declaration.type === 'ObjectExpression') {
        options = node.declaration.properties
      } else if (
        node.declaration.type === 'CallExpression' &&
        node.declaration.arguments[0].type === 'ObjectExpression'
      ) {
        options = node.declaration.arguments[0].properties
      }

      if (options) {
        for (const option of options) {
          if (
            option.type === 'ObjectMethod' &&
            option.key.type === 'Identifier' &&
            option.key.name === 'setup'
          ) {
            let exposed
            let returned

            for (const node of option.body.body) {
              if (
                !exposed &&
                node.type === 'ExpressionStatement' &&
                node.expression.type === 'CallExpression' &&
                node.expression.callee.type === 'Identifier' &&
                node.expression.callee.name === 'expose'
              ) {
                exposed = node.expression.arguments[0]
                continue
              }

              if (node.type === 'ReturnStatement') {
                returned = node
                break
              }
            }

            const newReturned =
              exposed && exposed.type === 'ObjectExpression'
                ? `return ${code.substring(exposed.start!, exposed.end!)}`
                : hasSetupScript
                  ? 'return {}'
                  : ''

            if (newReturned) {
              if (returned) {
                source.overwrite(returned.start!, returned.end!, newReturned)
              } else if (option.body.body.length) {
                source.appendRight(option.body.body.at(-1)!.end!, `\n${newReturned}\n`)
              }
            }

            break
          }
        }
      }

      break
    }
  }

  return source.toString()
}

export function compileVueCode(code: string) {
  const { compileScript, rewriteDefault } = requireCompiler()
  const descriptor = parseCode(code)
  const { script, scriptSetup } = descriptor

  let error: unknown
  let content: string
  let ext = 'js'

  if (script || scriptSetup) {
    const compiled = compileScript(
      {
        ...descriptor,
        script: transformJsToTs(script),
        scriptSetup: transformJsToTs(scriptSetup)
      },
      { id: `${index++}` }
    )

    try {
      content = transformExposed(compiled.content, !!scriptSetup)
    } catch (e) {
      error = e
      content = compiled.content
    }

    content = rewriteDefault(content, '_sfc_main', ['typescript', 'decorators-legacy'])

    if (scriptSetup) {
      content = transferSetupPosition(content)
      ext = scriptSetup.lang || 'js'
    } else if (script && script.content) {
      ext = script.lang || 'js'
    }

    content += '\nexport default _sfc_main\n'
  } else {
    content = noScriptContent
    ext = 'ts'
  }

  return { error, content, ext }
}

import { createRequire } from 'node:module'
import { parse as babelParse } from '@babel/parser'
import MagicString from 'magic-string'
import { transferSetupPosition } from './transform'

import type { ParserPlugin } from '@babel/parser'
import type { Node, Expression, CallExpression } from '@babel/types'
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

function preprocessVueCode(code: string, setupScript: SFCScriptBlock | null) {
  const plugins: ParserPlugin[] = ['typescript', 'decorators-legacy', 'jsx']
  const scriptAst = babelParse(code, { sourceType: 'module', plugins }).program.body
  const source = new MagicString(code)

  let propsTypeName: string | undefined
  let propsTypeLiteral: string | undefined

  if (setupScript) {
    const setupAst = babelParse(setupScript.content, { sourceType: 'module', plugins }).program.body

    let defineProps: CallExpression | undefined

    function processDefineProps(node: Expression) {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        if (node.callee.name === 'defineProps') {
          defineProps = node

          return true
        } else if (node.callee.name === 'withDefaults') {
          const propsDef = node.arguments[0]

          if (
            propsDef.type === 'CallExpression' &&
            propsDef.callee.type === 'Identifier' &&
            propsDef.callee.name === 'defineProps'
          ) {
            defineProps = propsDef

            return true
          }
        }
      }

      return false
    }

    for (const node of setupAst) {
      if (node.type === 'ExpressionStatement') {
        processDefineProps(node.expression)
      } else if (node.type === 'VariableDeclaration' && !node.declare) {
        for (const decl of node.declarations) {
          if (decl.init && processDefineProps(decl.init)) {
            break
          }
        }
      }

      // record props type and provide to PropType<...>
      if (defineProps) {
        const type = defineProps.typeParameters?.params[0]

        if (type && type.type === 'TSTypeReference' && type.typeName.type === 'Identifier') {
          propsTypeName = type.typeName.name
        } else if (type?.type === 'TSTypeLiteral') {
          propsTypeName = '__DTS_Props__'
          propsTypeLiteral = setupScript.content.substring(type.start!, type.end!)
        }

        break
      }
    }
  }

  const declRecord = new Map<string, Node[]>()

  let defaultExport
  let options

  for (const node of scriptAst) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id.type === 'Identifier' && decl.init) {
          let properties

          if (decl.init.type === 'ObjectExpression') {
            properties = decl.init.properties
          } else if (
            decl.init.type === 'CallExpression' &&
            decl.init.arguments[0]?.type === 'ObjectExpression'
          ) {
            properties = decl.init.arguments[0].properties
          }

          if (!properties) continue

          if (defaultExport && decl.id.name === defaultExport) {
            options = properties
            break
          } else {
            declRecord.set(decl.id.name, properties)
          }
        }
      }
    }

    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ObjectExpression') {
        options = node.declaration.properties
      } else if (
        node.declaration.type === 'CallExpression' &&
        node.declaration.arguments[0]?.type === 'ObjectExpression'
      ) {
        options = node.declaration.arguments[0].properties
      } else if (node.declaration.type === 'Identifier') {
        if (declRecord.has(node.declaration.name)) {
          options = declRecord.get(node.declaration.name)
        } else {
          defaultExport = node.declaration.name
        }
      }
    }

    if (options) {
      for (const option of options) {
        if (
          propsTypeName &&
          option.type === 'ObjectProperty' &&
          option.key.type === 'Identifier' &&
          option.key.name === 'props' &&
          option.value.type === 'ObjectExpression'
        ) {
          // make prop type define with PropType<...>
          for (const prop of option.value.properties) {
            if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
              if (prop.value.type === 'ObjectExpression') {
                for (const propDef of prop.value.properties) {
                  if (
                    propDef.type === 'ObjectProperty' &&
                    propDef.key.type === 'Identifier' &&
                    propDef.key.name === 'type'
                  ) {
                    source.prependLeft(
                      propDef.end!,
                      ` as unknown as __PropType<${propsTypeName}['${prop.key.name}']>`
                    )
                  }
                }
              } else {
                source.prependLeft(
                  prop.end!,
                  ` as unknown as __PropType<${propsTypeName}['${prop.key.name}']>`
                )
              }
            }
          }
        }

        // remove components option
        if (
          option.type === 'ObjectProperty' &&
          option.key.type === 'Identifier' &&
          option.key.name === 'components'
        ) {
          // source.remove(option.start!, option.end!)
          source.overwrite(option.value.start!, option.value.end!, 'undefined')
        }

        // use exposed as return value
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
              : setupScript
                ? 'return {}'
                : ''

          if (newReturned) {
            if (returned) {
              source.overwrite(returned.start!, returned.end!, newReturned)
            } else if (option.body.body.length) {
              source.appendRight(option.body.body.at(-1)!.end!, `\n${newReturned}\n`)
            }
          }
        }
      }

      break
    }
  }

  if (propsTypeName) {
    if (propsTypeLiteral) {
      source.prepend(`\ntype ${propsTypeName} = ${propsTypeLiteral}\n\n`)
    }

    source.prepend("import type { PropType as __PropType } from 'vue'\n")
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
        scriptSetup: transformJsToTs(scriptSetup),
        cssVars: []
      },
      { id: `${index++}` }
    )

    try {
      content = preprocessVueCode(compiled.content, scriptSetup)
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

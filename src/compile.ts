import { transferSetupPosition } from './transform'

const exportDefaultRE = /export\s+default/
const exportDefaultClassRE = /(?:(?:^|\n|;)\s*)export\s+default\s+class\s+([\w$]+)/

let index = 1
let compiler: typeof import('vue/compiler-sfc')

function requireCompiler() {
  if (!compiler) {
    try {
      // Vue 3.2.13+ ships the SFC compiler directly under the `vue` package
      compiler = require('vue/compiler-sfc')
    } catch (e) {
      try {
        compiler = require('@vue/compiler-sfc')
      } catch (e) {
        throw new Error('@vue/compiler-sfc is not present in the dependency tree.\n')
      }
    }
  }

  return compiler
}

export function compileVueCode(code: string) {
  const { parse, compileScript, rewriteDefault } = requireCompiler()
  const { descriptor } = parse(code)
  const { script, scriptSetup } = descriptor

  let content: string | null = null
  let ext: string | null = null

  if (script || scriptSetup) {
    if (scriptSetup) {
      const compiled = compileScript(descriptor, {
        id: `${index++}`
      })

      const classMatch = compiled.content.match(exportDefaultClassRE)

      if (classMatch) {
        content =
          compiled.content.replace(exportDefaultClassRE, '\nclass $1') +
          `\nconst _sfc_main = ${classMatch[1]}`

        if (exportDefaultRE.test(content)) {
          content = rewriteDefault(compiled.content, '_sfc_main')
        }
      } else {
        content = rewriteDefault(compiled.content, '_sfc_main')
      }

      content = transferSetupPosition(content)
      content += '\nexport default _sfc_main\n'

      ext = scriptSetup.lang || 'js'
    } else if (script && script.content) {
      content = script.content
      ext = script.lang || 'js'
    }
  }

  return { content, ext }
}

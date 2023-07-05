import { resolve } from '../utils'

import type { Resolver } from '../types'

const vueRE = /\.vue$/

export function VueResolver(): Resolver {
  return {
    name: 'vue',
    supports(id) {
      return vueRE.test(id)
    },
    transform({ id, root, program, service }) {
      let sourceFile = program.getSourceFile(id)

      if (!sourceFile && vueRE.test(id)) {
        sourceFile =
          program.getSourceFile(id + '.ts') ||
          program.getSourceFile(id + '.js') ||
          program.getSourceFile(id + '.tsx') ||
          program.getSourceFile(id + '.jsx')
      }

      if (!sourceFile) return []

      return service.getEmitOutput(sourceFile.fileName, true).outputFiles.map(file => {
        return {
          path: resolve(root, file.name),
          content: file.text
        }
      })
    }
  }
}

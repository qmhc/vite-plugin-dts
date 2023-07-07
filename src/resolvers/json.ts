import ts from 'typescript'
import { resolve } from '../utils'

import type { Resolver } from '../types'

const jsonRE = /\.json5?$/

export function JsonResolver(): Resolver {
  return {
    name: 'json',
    supports(id) {
      return jsonRE.test(id)
    },
    transform({ id, program }) {
      const sourceFile = program.getSourceFile(id)

      if (!sourceFile) return []

      return [
        {
          path: `${id}.d.ts`,
          content: `declare const _default: ${sourceFile.text.trim()};\n\nexport default _default;\n`
        }
      ]
    }
  }
}

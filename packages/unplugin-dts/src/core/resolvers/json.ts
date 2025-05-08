import { relative } from 'node:path'

import type { Resolver } from '../types'

const jsonRE = /\.json$/

export function JsonResolver(): Resolver {
  return {
    name: 'json',
    supports(id) {
      return jsonRE.test(id)
    },
    transform({ id, root, program }) {
      const sourceFile = program.getSourceFile(id)

      if (!sourceFile) return []

      return [
        {
          path: relative(root, `${id}.d.ts`),
          content: `declare const _default: ${sourceFile.text};\n\nexport default _default;\n`,
        },
      ]
    },
  }
}

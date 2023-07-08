import { relative } from 'node:path'

import type { Resolver } from '../types'

const svelteRE = /\.svelte$/

export function SvelteResolver(): Resolver {
  return {
    name: 'svelte',
    supports(id) {
      return svelteRE.test(id)
    },
    transform({ id, root }) {
      return [
        {
          path: relative(root, `${id}.d.ts`),
          content: "export { SvelteComponentTyped as default } from 'svelte';\n"
        }
      ]
    }
  }
}

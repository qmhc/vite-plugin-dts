import { relative } from 'node:path'

import { compare } from 'compare-versions'
import { tryGetPackageInfo } from '../core/utils'

import type { Resolver } from '../types'

const svelteRE = /\.svelte$/

let lowerVersion: boolean

function querySvelteVersion() {
  if (typeof lowerVersion === 'boolean') return

  try {
    const version = tryGetPackageInfo('svelte')?.version
    lowerVersion = version ? compare(version, '4.0.0', '<') : false
  } catch (e) {
    lowerVersion = false
  }
}

export function SvelteResolver(): Resolver {
  return {
    name: 'svelte',
    supports(id) {
      return svelteRE.test(id)
    },
    transform({ id, root }) {
      querySvelteVersion()

      return [
        {
          path: relative(root, `${id}.d.ts`),
          content: `export { ${lowerVersion ? 'SvelteComponentTyped' : 'SvelteComponent'} as default } from 'svelte';\n`
        }
      ]
    }
  }
}

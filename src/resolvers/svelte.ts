import type { Resolver } from '../types'

const svelteRE = /\.svelte$/

export function SvelteResolver(): Resolver {
  return {
    name: 'svelte',
    supports(id) {
      return svelteRE.test(id)
    },
    transform({ id }) {
      return [
        {
          path: `${id}.d.ts`,
          content: "export { SvelteComponentTyped as default } from 'svelte';"
        }
      ]
    }
  }
}

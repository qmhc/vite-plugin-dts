import type { Resolver } from '../types'

export * from './svelte'
export * from './vue'

export function parseResolvers(resolvers: Resolver[]) {
  const nameMap = new Map<string, Resolver>()

  for (const resolver of resolvers) {
    resolver.name && nameMap.set(resolver.name, resolver)
  }

  return Array.from(nameMap.values())
}

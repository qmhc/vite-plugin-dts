import ts from 'typescript'
import { createUnplugin } from 'unplugin'
import { normalizeGlob } from './transform'
import { ensureAbsolute, ensureArray, getTsConfig } from './utils'

import type { PluginOptions } from './types'

export const dtsPlugin = createUnplugin((options: PluginOptions = {}) => {
  const { tsConfigFilePath = 'tsconfig.json' } = options

  let compilerOptions = options.compilerOptions ?? {}
  let root = ensureAbsolute(options.root ?? '', process.cwd())
  let include: string[]
  let exclude: string[]

  return {
    name: 'unplugin-dts',

    vite: {
      configResolved(config) {
        root = ensureAbsolute(options.root ?? '', config.root)
      }
    },

    buildStart() {
      const tsConfigPath = ensureAbsolute(tsConfigFilePath, root)
      const tsConfig = getTsConfig(tsConfigPath, ts.sys.readFile)

      include = ensureArray(options.include ?? tsConfig.include ?? '**/*').map(normalizeGlob)
      exclude = ensureArray(options.exclude ?? tsConfig.exclude ?? 'node_modules/**').map(
        normalizeGlob
      )
      compilerOptions = tsConfig.compilerOptions
    }
  }
})

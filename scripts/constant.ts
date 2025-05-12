import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const rootDir = resolve(fileURLToPath(import.meta.url), '../..')
export const pkgsDir = resolve(rootDir, 'packages')
export const unpluginDir = resolve(pkgsDir, 'unplugin-dts')
export const vitePluginDir = resolve(pkgsDir, 'vite-plugin-dts')

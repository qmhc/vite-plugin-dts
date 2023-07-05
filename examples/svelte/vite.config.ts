import { resolve } from 'node:path'
import { existsSync, readdirSync, rmSync } from 'node:fs'

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import dts from '../../src'

emptyDir(resolve(__dirname, 'dist'))
emptyDir(resolve(__dirname, 'types'))

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: [resolve(__dirname, 'src/main.ts')],
      name: 'Test',
      formats: ['es']
    }
  },
  plugins: [
    svelte(),
    dts({
      outDir: ['dist', 'types'],
      staticImport: true,
      rollupTypes: true,
      insertTypesEntry: true
    })
  ]
})

function emptyDir(dir: string) {
  if (!existsSync(dir)) {
    return
  }

  for (const file of readdirSync(dir)) {
    rmSync(resolve(dir, file), { recursive: true, force: true })
  }
}

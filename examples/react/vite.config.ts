import { resolve } from 'node:path'
import { existsSync, readdirSync, rmSync } from 'node:fs'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
      entry: [resolve(__dirname, 'src/index.ts'), resolve(__dirname, 'src/main.ts')],
      name: 'Test',
      formats: ['es']
    }
  },
  plugins: [
    react(),
    dts({
      outDir: ['dist', 'types'],
      // include: ['src/index.ts'],
      exclude: ['src/ignore'],
      // aliasesExclude: [/^@components/],
      staticImport: true,
      // rollupTypes: true,
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

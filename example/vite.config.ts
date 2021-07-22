import { resolve } from 'path'
import { existsSync, readdirSync, lstatSync, rmdirSync, unlinkSync } from 'fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from '../src'

emptyDir(resolve(__dirname, 'types'))

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\/(.+)/, replacement: resolve(__dirname, '$1') }]
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Test',
      formats: ['es'],
      fileName: 'test'
    },
    rollupOptions: {
      external: ['vue']
    }
  },
  plugins: [
    dts({
      outputDir: 'types',
      exclude: ['src/ignore'],
      staticImport: true,
      insertTypesEntry: true
    }),
    vue()
  ]
})

function emptyDir(dir: string): void {
  if (!existsSync(dir)) {
    return
  }

  for (const file of readdirSync(dir)) {
    const abs = resolve(dir, file)

    // baseline is Node 12 so can't use rmSync
    if (lstatSync(abs).isDirectory()) {
      emptyDir(abs)
      rmdirSync(abs)
    } else {
      unlinkSync(abs)
    }
  }
}

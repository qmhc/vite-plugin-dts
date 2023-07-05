import { resolve } from 'path'
import { existsSync, readdirSync, rmSync } from 'fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dts from '../../src'

emptyDir(resolve(__dirname, 'dist'))
emptyDir(resolve(__dirname, 'types'))

export default defineConfig({
  resolve: {
    // alias: [{ find: /^@\/(.+)/, replacement: resolve(__dirname, '$1') }]
    alias: {
      '@': resolve(__dirname),
      '@components': resolve(__dirname, 'src/components')
    }
  },
  build: {
    lib: {
      entry: [resolve(__dirname, 'src/index.ts'), resolve(__dirname, 'src/main.ts')],
      name: 'Test',
      formats: ['es']
      // fileName: 'test'
    },
    rollupOptions: {
      external: ['vue']
    }
  },
  plugins: [
    dts({
      copyDtsFiles: true,
      outDir: ['dist', 'types'],
      // include: ['src/index.ts'],
      exclude: ['src/ignore'],
      staticImport: true,
      rollupTypes: true,
      insertTypesEntry: true
    }),
    vue(),
    vueJsx()
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

import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from '../src'

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
      staticImport: true
    }),
    vue()
  ]
})

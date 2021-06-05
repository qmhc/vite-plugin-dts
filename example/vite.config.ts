import { resolve, relative } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from '../src'

const distDir = resolve(__dirname, 'dist')

export default defineConfig({
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
    vue(),
    dts({
      staticImport: true,
      beforeWriteFile(filePath) {
        filePath = resolve(distDir, relative(resolve(distDir, 'src'), filePath))

        return { filePath }
      }
    })
  ]
})

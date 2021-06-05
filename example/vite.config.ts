import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from '../src'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Test',
      formats: ['es'],
      fileName: 'test'
    }
  },
  plugins: [vue(), dts()]
})

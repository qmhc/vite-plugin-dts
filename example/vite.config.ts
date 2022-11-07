import { resolve } from 'path'
import { existsSync, readdirSync, lstatSync, rmdirSync, unlinkSync } from 'fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { dtsPlugin } from '../src/plugin'
// import dtsPlugin from 'vite-plugin-dts'

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
    dtsPlugin({
      libFolderPath: '../node_modules/typescript/lib',
      outputDir: ['dist', 'types'],
      // include: ['src/index.ts'],
      exclude: ['src/ignore'],
      // aliasesExclude: [/^@components/],
      staticImport: true,
      skipDiagnostics: false,
      logDiagnostics: true,
      rollupTypes: true,
      insertTypesEntry: true
    }),
    vue(),
    vueJsx()
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

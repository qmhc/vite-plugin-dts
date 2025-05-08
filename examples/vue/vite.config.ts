import { resolve } from 'path'
import { existsSync, readdirSync, rmSync } from 'fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dts from '../../packages/unplugin-dts/src/vite'

emptyDir(resolve(__dirname, 'dist'))
emptyDir(resolve(__dirname, 'types'))

export default defineConfig({
  resolve: {
    // alias: {
    //   '@': resolve(__dirname),
    //   '@components': resolve(__dirname, 'src/components')
    // }
    alias: [
      {
        find: /@\//,
        replacement: resolve(__dirname) + '/',
      },
      { find: '@components', replacement: resolve(__dirname, 'src/components') },
    ],
  },
  build: {
    // watch: {},
    lib: {
      entry: [resolve(__dirname, 'src/index.ts'), resolve(__dirname, 'src/main.ts')],
      name: 'Test',
      formats: ['es'],
      // fileName: 'test'
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
  plugins: [
    // @ts-ignore
    dts({
      copyDtsFiles: true,
      outDirs: [
        'dist',
        'types',
        // 'types/inner'
      ],
      // include: ['src/index.ts'],
      exclude: ['src/ignore'],
      // staticImport: true,
      // rollupTypes: true,
      // insertTypesEntry: true,
      compilerOptions: {
        declarationMap: true,
      },
      rollupConfig: {
        docModel: {
          enabled: true,
          apiJsonFilePath: '<projectFolder>/docs/<unscopedPackageName>.api.json',
        },
      },
    }),
    vue(),
    vueJsx(),
  ],
})

function emptyDir(dir: string) {
  if (!existsSync(dir)) {
    return
  }

  for (const file of readdirSync(dir)) {
    rmSync(resolve(dir, file), { recursive: true, force: true })
  }
}

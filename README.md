# vite-plugin-dts

A vite plugin that generate `d.ts` file from containing `.vue` files base on `ts-morph`.

## Install

```sh
yarn add vite-plugin-dts -D
```

## Usage

```ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      formats: ['es'],
      fileName: 'my-lib'
    }
  },
  plugins: [
    vue(),
    dts()
    // pluginOptions: {
    //   include: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    //   exclude: 'node_modules/**',
    //   root: process.cwd(),
    //   projectOptions: null, // use to ts-morph Project
    //   cleanVueFileName: false
    // }
  ]
})
```

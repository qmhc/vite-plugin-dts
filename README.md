# vite-plugin-dts

**English** | [中文](./README.zh-CN.md)

A vite plugin that generate `.d.ts` file from containing `.vue` files base on `ts-morph`.

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
  plugins: [vue(), dts()]
})
```

## Options

```ts
import type { ts } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string
  content?: string
}

export interface PluginOptions {
  // Depends on the root directory
  // Defaults base on your vite config root options
  root?: string

  // Declaration files output directory
  // Defaults base on your vite config output options
  outputDir?: string

  // Project init compilerOptions using by ts-morph
  // Default: null
  compilerOptions?: ts.CompilerOptions | null

  // Project init tsconfig.json file path by ts-morph
  // Plugin also resolve incldue and exclude files from tsconfig.json
  // Default: 'tsconfig.json'
  tsConfigFilePath?: string

  // Whether transform file name '.vue.d.ts' to '.d.ts'
  // Default: false
  cleanVueFileName?: boolean

  // Whether transform dynamic import to static
  // eg. 'import('vue').DefineComponent' to 'import { DefineComponent } from "vue"'
  // Default: false
  staticImport?: boolean

  // Before declaration file be writed hook
  // You can transform declaration file-path and content through it
  // Default: () => {}
  beforeWriteFile?: (filePath: string, content: string) => void | TransformWriteFile
}
```

## Example

Clone and run the following script:

```sh
yarn run test:e2e
```

Then check `example/types`.

## License

MIT License.

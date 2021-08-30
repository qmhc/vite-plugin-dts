# vite-plugin-dts

**English** | [中文](./README.zh-CN.md)

A vite plugin that generate `.d.ts` files from `.ts` or `.vue` source files for lib.

## Install

```sh
yarn add vite-plugin-dts -D
```

## Usage

```ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
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
  plugins: [dts()]
})
```

## Options

```ts
import type { ts, Diagnostic } from 'ts-morph'

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

  // Manual set include glob
  // Defaults base on your tsconfig.json include option
  include?: string | string[]

  // Manual set exclude glob
  // Defaults base on your tsconfig.json exclude option, be 'node_module/**' when empty
  exclude?: string | string[]

  // Whether generate types entry file
  // When true will from package.json types field if exists or `${outputDir}/index.d.ts`
  // Default: false
  insertTypesEntry?: boolean

  // Whether copy .d.ts source files into outputDir
  // Default: true
  copyDtsFiles?: boolean

  // Whether emit nothing when has any diagnostic
  // Default: false
  noEmitOnError?: boolean

  // Whether log diagnostic informations
  // Default: false
  logDiagnostics?: boolean

  // After emit diagnostic hook
  // According to the length to judge whether there is any type error
  // Default: () => {}
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void

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

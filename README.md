# vite-plugin-dts

**English** | [中文](./README.zh-CN.md)

A vite plugin that generate `.d.ts` files from `.ts` or `.vue` source files for lib.

## Install

```sh
yarn add vite-plugin-dts -D
```

## Usage

In `vite.config.ts`:

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

In your component:

```vue
<template>
  <div></div>
</template>

<script lang="ts">
// using defineComponent for inferring types
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Component'
})
</script>
```

```vue
<script setup lang="ts">
// Need to access the defineProps returned value to
// infer types although you never use the props directly
const props = defineProps<{
  color: 'blue' | 'red'
}>()
</script>

<template>
  <div>{{ color }}</div>
</template>
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

  // Whether skip typescript diagnostics
  // Skip type diagnostics means that type errors will not interrupt the build process
  // But for the source files with type errors will not be emitted
  // Default: true
  skipDiagnostics?: boolean

  // Whether log diagnostic informations
  // Not effective when `skipDiagnostics` is true
  // Default: false
  logDiagnostics?: boolean

  // After emit diagnostic hook
  // According to the length to judge whether there is any type error
  // Default: () => {}
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void | Promise<void>

  // Before declaration file be writed hook
  // You can transform declaration file-path and content through it
  // Default: () => {}
  beforeWriteFile?: (filePath: string, content: string) => void | TransformWriteFile

  // After build hook
  // It wil be called after all declaration files are written
  // Default: () => {}
  afterBuild?: () => void | Promise<void>
}
```

## Example

Clone and run the following script:

```sh
yarn run test:e2e
```

Then check `example/types`.

## FAQ

Here will include some FAQ's and provide some solutions.

### Missing some declaration files after build

By default `skipDiagnostics` option is `true`, which means that type diagnostic will be skipped during the build process (some projects may have diagnostic tool such as `vue-tsc`). If there are some files with type errors which will interrupt the build process, these files will not be emitted (not generate declaration files).

If your project has not type diagnostic tools, you can set `skipDiagnostics: false` and `logDiagnostics: true` to turn on the diagnostic and log features of this plugin. It will help you to check the type errors during build and log error information to the terminal.

## License

MIT License.

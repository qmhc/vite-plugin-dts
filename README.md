# vite-plugin-dts

**English** | [中文](./README.zh-CN.md)

A vite plugin that generates declaration files (`*.d.ts`) from `.ts(x)` or `.vue` source files when using vite in [library mode](https://vitejs.dev/guide/build.html#library-mode).

> **Notice**: `skipDiagnostics` option default to `false` since 1.7.0.

## Install

```sh
pnpm add vite-plugin-dts -D
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

## FAQ

Here are some FAQ's and solutions.

### Missing some declaration files after build

By default `skipDiagnostics` option is `true`, which means that type diagnostic will be skipped during the build process (some projects may have diagnostic tools such as `vue-tsc`). If there are some files with type errors which interrupt the build process, these files will not be emitted (declaration files won't be generated).

If your project doesn't use type diagnostic tools, you can set `skipDiagnostics: false` and `logDiagnostics: true` to turn on the diagnostic and log features of this plugin. It will help you check the type errors during build and log error information to the terminal.

### Take type error when using both `script` and `setup-script` in vue component

This is usually caused by using `defineComponent` function in both `script` and `setup-script`. When `vue/compiler-sfc` compiles these files, the default export result from `script` gets merged with the parameter object of `defineComponent` from `setup-script`. This is incompatible with parameters and types returned from `defineComponent`, which results in a type error.

Here is a simple [example](https://github.com/qmhc/vite-plugin-dts/blob/main/example/components/BothScripts.vue), you should remove the `defineComponent` which in `script` and export a native object directly.

### Take errors that unable to infer types from packages which under `node_modules`

This is a exist issue when TypeScript inferring types from packages which under `node_modules` through soft links (pnpm), you can refer to this [issue](https://github.com/microsoft/TypeScript/issues/42873). Currently has a workaround that add `baseUrl` to your `tsconfig.json` and specify the `paths` for these packages:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "third-lib": ["node_modules/third-lib"]
    }
  }
}
```

## Options

```ts
import type { ts, Diagnostic } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string
  content?: string
}

export interface PluginOptions {
  /**
   * Depends on the root directory
   *
   * Defaults base on your vite config root options
   */
  root?: string

  /**
   * Declaration files output directory
   *
   * Can be specified a array to output to multiple directories
   *
   * Defaults base on your vite config output options
   */
  outputDir?: string | string[]

  /**
   * Manually set the root path of the entry files
   *
   * The output path of each file will be caculated base on it
   *
   * Defaults is the smallest public path for all files
   */
  entryRoot?: string

  /**
   * Project init compilerOptions using by ts-morph
   *
   * @default null
   */
  compilerOptions?: ts.CompilerOptions | null

  /**
   * Project init tsconfig.json file path by ts-morph
   *
   * Plugin also resolve incldue and exclude files from tsconfig.json
   *
   * @default 'tsconfig.json'
   */
  tsConfigFilePath?: string

  /**
   * Set which paths should exclude when transform aliases
   *
   * If it's regexp, it will test the original import path directly
   *
   * @default []
   */
  aliasesExclude?: (string | RegExp)[]

  /**
   * Whether transform file name '.vue.d.ts' to '.d.ts'
   *
   * @default false
   */
  cleanVueFileName?: boolean

  /**
   * Whether transform dynamic import to static
   *
   * Force true when `rollupTypes` is effective
   *
   * eg. 'import('vue').DefineComponent' to 'import { DefineComponent } from "vue"'
   *
   * @default false
   */
  staticImport?: boolean

  /**
   * Manual set include glob
   *
   * Defaults base on your tsconfig.json include option
   */
  include?: string | string[]

  /**
   * Manual set exclude glob
   *
   * Defaults base on your tsconfig.json exclude option, be 'node_module/**' when empty
   */
  exclude?: string | string[]

  /**
   * Do not emit if content of file only includes 'export {}'
   *
   * @default true
   */
  clearPureImport?: boolean

  /**
   * Whether generate types entry file
   *
   * When true will from package.json types field if exists or `${outputDir}/index.d.ts`
   *
   * Force true when `rollupTypes` is effective
   *
   * @default false
   */
  insertTypesEntry?: boolean

  /**
   * Set to rollup declaration files after emit
   *
   * Power by `@microsoft/api-extractor`, it will start a new program which takes some time
   *
   * @default false
   */
  rollupTypes?: boolean

  /**
   * Whether copy .d.ts source files into outputDir
   *
   * @default true
   */
  copyDtsFiles?: boolean

  /**
   * Whether emit nothing when has any diagnostic
   *
   * @default false
   */
  noEmitOnError?: boolean

  /**
   * Whether skip typescript diagnostics
   *
   * Skip type diagnostics means that type errors will not interrupt the build process
   *
   * But for the source files with type errors will not be emitted
   *
   * @default false
   */
  skipDiagnostics?: boolean

  /**
   * Whether log diagnostic informations
   *
   * Not effective when `skipDiagnostics` is true
   *
   * @deprecated
   * @default false
   */
  logDiagnostics?: boolean

  /**
   * Customize typescript lib folder path
   *
   * Should pass a relative path to root or a absolute path
   *
   * @default undefined
   */
  libFolderPath?: string

  /**
   * After emit diagnostic hook
   *
   * According to the length to judge whether there is any type error
   *
   * @default () => {}
   */
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void | Promise<void>

  /**
   * Before declaration file be writed hook
   *
   * You can transform declaration file-path and content through it
   *
   * The file will be skipped when return exact false
   *
   * @default () => {}
   */
  beforeWriteFile?: (filePath: string, content: string) => void | false | TransformWriteFile

  /**
   * After build hook
   *
   * It wil be called after all declaration files are written
   *
   * @default () => {}
   */
  afterBuild?: () => void | Promise<void>
}
```

## Example

Clone and run the following script:

```sh
pnpm run test:e2e
```

Then check `example/types`.

## License

MIT License.

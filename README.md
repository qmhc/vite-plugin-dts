<h1 align="center">vite-plugin-dts</h1>

<p align="center">
  A vite plugin that generates declaration files (<code>*.d.ts</code>) from <code>.ts(x)</code> or <code>.vue</code> source files when using vite in <a href="https://vitejs.dev/guide/build.html#library-mode">library mode</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-dts">
    <img src="https://img.shields.io/npm/v/vite-plugin-dts?color=orange&label=" alt="version" />
  </a>
</p>

<p align="center">
  <strong>English</strong> | <a href="./README.zh-CN.md">中文</a>
</p>

<p align="center"><strong>Notice: </strong><code>skipDiagnostics</code> option default to <code>false</code> since 1.7.0.</p>

<br />

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

### Missing some declaration files after build (before `1.7.0`)

By default, the `skipDiagnostics` option is set to `true` which means type diagnostic will be skipped during the build process (some projects may have diagnostic tools such as `vue-tsc`). If there are some files with type errors which interrupt the build process, these files will not be emitted (declaration files won't be generated).

If your project doesn't use type diagnostic tools, you can set `skipDiagnostics: false` and `logDiagnostics: true` to turn on diagnostic and logging features of this plugin. It will help you check the type errors during build and log error information to the terminal.

### Type error when using both `script` and `setup-script` in Vue component

This is usually caused by using the `defineComponent` function in both `script` and `setup-script`. When `vue/compiler-sfc` compiles these files, the default export result from `script` gets merged with the parameter object of `defineComponent` from `setup-script`. This is incompatible with parameters and types returned from `defineComponent`, which results in a type error.

Here is a simple [example](https://github.com/qmhc/vite-plugin-dts/blob/main/examples/vue/components/BothScripts.vue). You should remove the `defineComponent` which in `script` and export a native object directly.

### Type errors that are unable to infer types from packages in `node_modules`

This is an existing issue when TypeScript infers types from packages located in `node_modules` through soft links (pnpm). Please refer to [this TypeScript issue](https://github.com/microsoft/TypeScript/issues/42873). The current workaround is to add `baseUrl` to your `tsconfig.json` and specify the `paths` for these packages:

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
import type { LogLevel } from 'vite'

interface TransformWriteFile {
  filePath?: string
  content?: string
}

export interface PluginOptions {
  /**
   * Depends on the root directory
   *
   * Defaults to 'root' property in your vite config
   */
  root?: string

  /**
   * Declaration files output directory
   *
   * Supports arrays to output to multiple directories
   *
   * Defaults to 'build.outDir' property in your vite config
   */
  outputDir?: string | string[]

  /**
   * Manually sets the root path of entry files
   *
   * The output path of each file will be calculated based on it
   *
   * Defaults to the shortest public path for all files
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
   * Plugin also resolves include and exclude files from tsconfig.json
   *
   * @default 'tsconfig.json'
   */
  tsConfigFilePath?: string

  /**
   * Set which paths should exclude when transform aliases
   *
   * If a regular expression, it will test the original import path directly
   *
   * @default []
   */
  aliasesExclude?: (string | RegExp)[]

  /**
   * Whether tp transform file name '.vue.d.ts' to '.d.ts'
   *
   * @default false
   */
  cleanVueFileName?: boolean

  /**
   * Whether to transform dynamic imports to static
   *
   * Force true when `rollupTypes` is effective
   *
   * eg. 'import('vue').DefineComponent' to 'import { DefineComponent } from "vue"'
   *
   * @default false
   */
  staticImport?: boolean

  /**
   * Specify a glob of files to include
   *
   * Defaults to 'include' property of the tsconfig.json
   */
  include?: string | string[]

  /**
   * Specify a glob of files to exclude
   *
   * Defaults to 'exclude' property of tsconfig.json and 'node_module/**' when empty
   */
  exclude?: string | string[]

  /**
   * Do not emit if content of file only includes 'export {}'
   *
   * @default true
   */
  clearPureImport?: boolean

  /**
   * Whether to generate types entry file
   *
   * When set to true, will add package.json `types` property to `${outputDir}/index.d.ts`
   *
   * Force true when `rollupTypes` is set
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
   * Whether to copy .d.ts source files to outputDir
   *
   * @default false
   * @remarks Prior to 2.0, the default was true
   */
  copyDtsFiles?: boolean

  /**
   * Whether to emit nothing when there is a diagnostic
   *
   * @default false
   */
  noEmitOnError?: boolean

  /**
   * Whether to skip Typescript diagnostics
   *
   * Skip type diagnostics means type errors will not interrupt the build process
   *
   * But source files with type errors will not be emitted
   *
   * @default false
   * @remarks Before 1.7, default was true
   */
  skipDiagnostics?: boolean

  /**
   * Customize Typescript lib folder path
   *
   * Relative path to root or an absolute path
   *
   * @default undefined
   */
  libFolderPath?: string

  /**
   * Specify the log level of plugin
   *
   * Defaults to base 'logLevel' property of your vite config
   */
  logLevel?: LogLevel

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

## Contributors

Thanks for all the contributions!

<a href="https://github.com/qmhc/vite-plugin-dts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=qmhc/vite-plugin-dts" />
</a>

## Example

Clone and run the following script:

```sh
pnpm run test:ts
```

Then check `examples/ts/types`.

## License

MIT License.

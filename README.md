<h1 align="center">vite-plugin-dts</h1>

<p align="center">
  A Vite plugin that generates declaration files (<code>*.d.ts</code>) from <code>.ts(x)</code> or <code>.vue</code> source files when using Vite in <a href="https://vitejs.dev/guide/build.html#library-mode">library mode</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-dts">
    <img src="https://img.shields.io/npm/v/vite-plugin-dts?color=orange&label=" alt="version" />
  </a>
  <a href="https://github.com/qmhc/vite-plugin-dts/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/vite-plugin-dts" alt="license" />
  </a>
</p>

**English** | [中文](./README.zh-CN.md)

## Install

```sh
pnpm i vite-plugin-dts -D
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

Starting from `3.0.0`, you can use this plugin in Rollup.

## FAQ

Here are some FAQ's and solutions.

### Missing some declaration files after build (before `1.7.0`)

By default, the `skipDiagnostics` option is set to `true` which means type diagnostic will be skipped during the build process (some projects may have diagnostic tools such as `vue-tsc`). If there are some files with type errors which interrupt the build process, these files will not be emitted (declaration files won't be generated).

If your project doesn't use type diagnostic tools, you can set `skipDiagnostics: false` and `logDiagnostics: true` to turn on diagnostic and logging features of this plugin. It will help you check the type errors during build and log error information to the terminal.

### Type error when using both `script` and `setup-script` in Vue component (before `3.0.0`)

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
import type ts from 'typescript'
import type { LogLevel } from 'vite'

type MaybePromise<T> = T | Promise<T>

export interface Resolver {
  /**
   * The name of the resolver
   *
   * The later resolver with the same name will overwrite the earlier
   */
  name: string,
  /**
   * Determine whether the resolve supports the file
   */
  supports: (id: string) => void | boolean,
  /**
   * Transform the source file to declaration files
   */
  transform: (payload: {
    id: string,
    code: string,
    root: string,
    host: ts.CompilerHost,
    program: ts.Program,
    service: ts.LanguageService
  }) => MaybePromise<{ path: string, content: string }[]>
}

export interface PluginOptions {
  /**
   * Specify root directory
   *
   * By Default it base on 'root' of your Vite config, or `process.cwd()` if using Rollup
   */
  root?: string,

  /**
   * Specify declaration files output directory
   *
   * Can be specified a array to output to multiple directories
   *
   * By Default it base on 'build.outDir' of your Vite config, or `outDir` of tsconfig.json if using Rollup
   */
  outDir?: string | string[],

  /**
   * Manually set the root path of the entry files, useful in monorepo
   *
   * The output path of each file will be calculated base on it
   *
   * By Default it is the smallest public path for all files
   */
  entryRoot?: string,

  /**
   * Strictly restrict declaration files output inside `outDir`
   *
   * Because if `entryRoot` is specified, declaration files maybe outside `outDir`
   *
   * @default true
   */
  strictOutput?: boolean,

  /**
   * Specify a CompilerOptions to override
   *
   * @default null
   */
  compilerOptions?: ts.CompilerOptions | null,

  /**
   * Specify tsconfig.json path
   *
   * Plugin also resolve include and exclude files from tsconfig.json
   *
   * By default plugin will find config form root if not specify
   */
  tsconfigPath?: string,

  /**
   * Specify custom resolvers
   *
   * @default []
   */
  resolvers?: Resolver[],

  /**
   * Set which paths should exclude when transform aliases
   *
   * If it's regexp, it will test the original import path directly
   *
   * @default []
   */
  aliasesExclude?: (string | RegExp)[],

  /**
   * Whether transform file name '.vue.d.ts' to '.d.ts'
   *
   * @default false
   */
  cleanVueFileName?: boolean,

  /**
   * Whether transform dynamic import to static
   *
   * Force `true` when `rollupTypes` is effective
   *
   * eg. `import('vue').DefineComponent` to `import { DefineComponent } from 'vue'`
   *
   * @default false
   */
  staticImport?: boolean,

  /**
   * Manual set include glob
   *
   * By Default it base on `include` option of the tsconfig.json
   */
  include?: string | string[],

  /**
   * Manual set exclude glob
   *
   * By Default it base on `exclude` option of the tsconfig.json, be `'node_module/**'` when empty
   */
  exclude?: string | string[],

  /**
   * Whether remove those `import 'xxx'`
   *
   * @default true
   */
  clearPureImport?: boolean,

  /**
   * Whether generate types entry file
   *
   * When `true` will from package.json types field if exists or `${outDir}/index.d.ts`
   *
   * Force `true` when `rollupTypes` is effective
   *
   * @default false
   */
  insertTypesEntry?: boolean,

  /**
   * Set whether rollup declaration files after emit
   *
   * Power by `@microsoft/api-extractor`, it will start a new program which takes some time
   *
   * @default false
   */
  rollupTypes?: boolean,

  /**
   * Bundled packages for `@microsoft/api-extractor`
   *
   * @default []
   * @see https://api-extractor.com/pages/configs/api-extractor_json/#bundledpackages
   */
  bundledPackages?: string[],

  /**
   * Whether copy .d.ts source files into `outDir`
   *
   * @default false
   * @remarks Before 2.0 it defaults to true
   */
  copyDtsFiles?: boolean,

  /**
   * Specify the log level of plugin
   *
   * By Default it base on 'logLevel' option of your Vite config
   */
  logLevel?: LogLevel,

  /**
   * Hook after diagnostic emitted
   *
   * According to the length to judge whether there is any type error
   *
   * @default () => {}
   */
  afterDiagnostic?: (diagnostics: readonly ts.Diagnostic[]) => MaybePromise<void>,

  /**
   * Hook before each declaration file is written
   *
   * You can transform declaration file's path and content through it
   *
   * The file will be skipped when return exact `false`
   *
   * @default () => {}
   */
  beforeWriteFile?: (
    filePath: string,
    content: string
  ) =>
  | void
  | false
  | {
    filePath?: string,
    content?: string
  },

  /**
   * Hook after built
   *
   * It wil be called after all declaration files are written
   *
   * @default () => {}
   */
  afterBuild?: () => MaybePromise<void>
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

Also Vue and React cases under `examples`.

A real project using this plugin: [Vexip UI](https://github.com/vexip-ui/vexip-ui).

## License

MIT License.

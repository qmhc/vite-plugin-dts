import type ts from 'typescript'
import type { LogLevel } from 'vite'

interface TransformWriteFile {
  filePath?: string,
  content?: string
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
   * When `true` will from package.json types field if exists or `` `${outDir}/index.d.ts` ``
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
  afterDiagnostic?: (diagnostics: readonly ts.Diagnostic[]) => void | Promise<void>,

  /**
   * Hook before each declaration file is written
   *
   * You can transform declaration file's path and content through it
   *
   * The file will be skipped when return exact `false`
   *
   * @default () => {}
   */
  beforeWriteFile?: (filePath: string, content: string) => void | false | TransformWriteFile,

  /**
   * Hook after built
   *
   * It wil be called after all declaration files are written
   *
   * @default () => {}
   */
  afterBuild?: () => void | Promise<void>
}

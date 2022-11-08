import type { ts, Diagnostic } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string,
  content?: string
}

export interface PluginOptions {
  /**
   * Depends on the root directory
   *
   * Defaults base on your vite config root options
   */
  root?: string,

  /**
   * Declaration files output directory
   *
   * Can be specified a array to output to multiple directories
   *
   * Defaults base on your vite config output options
   */
  outputDir?: string | string[],

  /**
   * Manually set the root path of the entry files
   *
   * The output path of each file will be caculated base on it
   *
   * Defaults is the smallest public path for all files
   */
  entryRoot?: string,

  /**
   * Project init compilerOptions using by ts-morph
   *
   * @default null
   */
  compilerOptions?: ts.CompilerOptions | null,

  /**
   * Project init tsconfig.json file path by ts-morph
   *
   * Plugin also resolve incldue and exclude files from tsconfig.json
   *
   * @default 'tsconfig.json'
   */
  tsConfigFilePath?: string,

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
   * Force true when `rollupTypes` is effective
   *
   * eg. 'import('vue').DefineComponent' to 'import { DefineComponent } from "vue"'
   *
   * @default false
   */
  staticImport?: boolean,

  /**
   * Manual set include glob
   *
   * Defaults base on your tsconfig.json include option
   */
  include?: string | string[],

  /**
   * Manual set exclude glob
   *
   * Defaults base on your tsconfig.json exclude option, be 'node_module/**' when empty
   */
  exclude?: string | string[],

  /**
   * Do not emit if content of file only includes 'export {}'
   *
   * @default true
   */
  clearPureImport?: boolean,

  /**
   * Whether generate types entry file
   *
   * When true will from package.json types field if exists or `${outputDir}/index.d.ts`
   *
   * Force true when `rollupTypes` is effective
   *
   * @default false
   */
  insertTypesEntry?: boolean,

  /**
   * Set to rollup declaration files after emit
   *
   * Power by `@microsoft/api-extractor`, it will start a new program which takes some time
   *
   * @default false
   */
  rollupTypes?: boolean,

  /**
   * Whether copy .d.ts source files into outputDir
   *
   * @default true
   */
  copyDtsFiles?: boolean,

  /**
   * Whether emit nothing when has any diagnostic
   *
   * @default false
   */
  noEmitOnError?: boolean,

  /**
   * Whether skip typescript diagnostics
   *
   * Skip type diagnostics means that type errors will not interrupt the build process
   *
   * But for the source files with type errors will not be emitted
   *
   * @default false
   */
  skipDiagnostics?: boolean,

  /**
   * Whether log diagnostic informations
   *
   * Not effective when `skipDiagnostics` is true
   *
   * @deprecated
   * @default false
   */
  logDiagnostics?: boolean,

  /**
   * Customize typescript lib folder path
   *
   * Should pass a relative path to root or a absolute path
   *
   * @default undefined
   */
  libFolderPath?: string,

  /**
   * After emit diagnostic hook
   *
   * According to the length to judge whether there is any type error
   *
   * @default () => {}
   */
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void | Promise<void>,

  /**
   * Before declaration file be writed hook
   *
   * You can transform declaration file-path and content through it
   *
   * The file will be skipped when return exact false
   *
   * @default () => {}
   */
  beforeWriteFile?: (filePath: string, content: string) => void | false | TransformWriteFile,

  /**
   * After build hook
   *
   * It wil be called after all declaration files are written
   *
   * @default () => {}
   */
  afterBuild?: () => void | Promise<void>
}

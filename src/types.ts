import type { LogLevel } from 'vite'
import type {
  CreateRuntimeOptions,
  EmitOptions,
  MaybePromise,
  Resolver,
  RollupConfig
} from './core/types'

export type { Resolver, RollupConfig }

export interface PluginOptions
  extends Omit<
      Partial<CreateRuntimeOptions>,
      'entries' | 'aliases' | 'libName' | 'indexName' | 'logger'
    >,
  Omit<EmitOptions, 'logPrefix'> {
  /**
   * Whether to emit declaration files only.
   *
   * When `true`, all the original outputs of vite (rollup) will be force removed.
   *
   * @default false
   */
  declarationOnly?: boolean,
  /**
   * Logging level for this plugin.
   *
   * Defaults to the 'logLevel' property of your Vite config.
   */
  logLevel?: LogLevel,
  /**
   * Hook called after all declaration files are written.
   *
   * It will be received a map (path -> content) that records those emitted files.
   *
   * @default () => {}
   */
  afterBuild?: (emittedFiles: Map<string, string>) => MaybePromise<void>
}

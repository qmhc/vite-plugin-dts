import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import { resolve, tryGetPkgPath } from './utils'

import type { ExtractorLogLevel, IExtractorInvokeOptions } from '@microsoft/api-extractor'
import type { RollupConfig } from './types'

export interface BundleOptions {
  root: string,
  configPath?: string,
  compilerOptions: Record<string, any>,
  outDir: string,
  entryPath: string,
  fileName: string,
  libFolder?: string,
  rollupConfig?: RollupConfig,
  rollupOptions?: IExtractorInvokeOptions
}

const dtsRE = /\.d\.(m|c)?tsx?$/

export function bundleDtsFiles({
  root,
  configPath,
  compilerOptions,
  outDir,
  entryPath,
  fileName,
  libFolder,
  rollupConfig = {},
  rollupOptions = {}
}: BundleOptions) {
  const configObjectFullPath = resolve(root, 'api-extractor.json')

  if (!dtsRE.test(fileName)) {
    fileName += '.d.ts'
  }

  // Refer to https://github.com/microsoft/rushstack/issues/4863
  if (/preserve/i.test(compilerOptions.module)) {
    compilerOptions = { ...compilerOptions, module: 'ESNext' }
  }

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      ...rollupConfig,
      projectFolder: root,
      mainEntryPointFilePath: entryPath,
      compiler: {
        tsconfigFilePath: configPath,
        overrideTsconfig: {
          $schema: 'http://json.schemastore.org/tsconfig',
          compilerOptions
        }
      },
      apiReport: {
        enabled: false,
        reportFileName: '<unscopedPackageName>.api.md',
        ...rollupConfig.apiReport
      },
      docModel: {
        enabled: false,
        ...rollupConfig.docModel
      },
      dtsRollup: {
        enabled: true,
        publicTrimmedFilePath: resolve(outDir, fileName)
      },
      tsdocMetadata: {
        enabled: false,
        ...rollupConfig.tsdocMetadata
      },
      messages: {
        compilerMessageReporting: {
          default: {
            logLevel: 'none' as ExtractorLogLevel.None
          }
        },
        extractorMessageReporting: {
          default: {
            logLevel: 'none' as ExtractorLogLevel.None
          }
        },
        ...rollupConfig.messages
      }
    },
    configObjectFullPath,
    packageJsonFullPath: tryGetPkgPath(configObjectFullPath)
  })

  return Extractor.invoke(extractorConfig, {
    localBuild: false,
    showVerboseMessages: false,
    showDiagnostics: false,
    typescriptCompilerFolder: libFolder,
    ...rollupOptions
  })
}

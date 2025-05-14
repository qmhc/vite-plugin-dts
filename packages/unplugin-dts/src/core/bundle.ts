import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import { resolve, tryGetPkgPath } from './utils'

import type { ExtractorLogLevel, IExtractorInvokeOptions } from '@microsoft/api-extractor'
import type { BundleConfig } from './types'

export interface BundleDtsOptions {
  root: string,
  configPath?: string,
  compilerOptions: Record<string, any>,
  outDir: string,
  entryPath: string,
  fileName: string,
  libFolder?: string,
  extractorConfig?: BundleConfig,
  bundledPackages?: string[],
  invokeOptions?: IExtractorInvokeOptions
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
  extractorConfig = {},
  bundledPackages,
  invokeOptions = {},
}: BundleDtsOptions) {
  const configObjectFullPath = resolve(root, 'api-extractor.json')

  if (!dtsRE.test(fileName)) {
    fileName += '.d.ts'
  }

  // Refer to https://github.com/microsoft/rushstack/issues/4863
  if (/preserve/i.test(compilerOptions.module)) {
    compilerOptions = { ...compilerOptions, module: 'ESNext' }
  }

  const config = ExtractorConfig.prepare({
    configObject: {
      ...extractorConfig,
      bundledPackages,
      projectFolder: root,
      mainEntryPointFilePath: entryPath,
      compiler: {
        tsconfigFilePath: configPath,
        overrideTsconfig: {
          $schema: 'http://json.schemastore.org/tsconfig',
          compilerOptions,
        },
      },
      apiReport: {
        enabled: false,
        reportFileName: '<unscopedPackageName>.api.md',
        ...extractorConfig.apiReport,
      },
      docModel: {
        enabled: false,
        ...extractorConfig.docModel,
      },
      dtsRollup: {
        enabled: true,
        publicTrimmedFilePath: resolve(outDir, fileName),
      },
      tsdocMetadata: {
        enabled: false,
        ...extractorConfig.tsdocMetadata,
      },
      messages: {
        compilerMessageReporting: {
          default: {
            logLevel: 'none' as ExtractorLogLevel.None,
          },
        },
        extractorMessageReporting: {
          default: {
            logLevel: 'none' as ExtractorLogLevel.None,
          },
        },
        ...extractorConfig.messages,
      },
    },
    configObjectFullPath,
    packageJsonFullPath: tryGetPkgPath(configObjectFullPath),
  })

  return Extractor.invoke(config, {
    localBuild: false,
    showVerboseMessages: false,
    showDiagnostics: false,
    typescriptCompilerFolder: libFolder,
    ...invokeOptions,
  })
}

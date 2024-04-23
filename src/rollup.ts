import { resolve } from 'node:path'

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import { tryGetPkgPath } from './utils'

import type ts from 'typescript'
import type { ExtractorLogLevel, IExtractorInvokeOptions } from '@microsoft/api-extractor'
import type { RollupConfig } from './types'

export interface BundleOptions {
  root: string,
  configPath?: string,
  compilerOptions: ts.CompilerOptions,
  outDir: string,
  entryPath: string,
  fileName: string,
  libFolder?: string,
  rollupConfig?: RollupConfig,
  rollupOptions?: IExtractorInvokeOptions
}

const dtsRE = /\.d\.tsx?$/

export function rollupDeclarationFiles({
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
    typescriptCompilerFolder: libFolder ? resolve(libFolder) : undefined,
    ...rollupOptions
  })
}

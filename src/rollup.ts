import { resolve } from 'node:path'

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import { tryGetPkgPath } from './utils'

import type { ExtractorLogLevel } from '@microsoft/api-extractor'
import type ts from 'typescript'

export interface BundleOptions {
  root: string,
  configPath?: string,
  compilerOptions: ts.CompilerOptions,
  outDir: string,
  entryPath: string,
  fileName: string,
  libFolder?: string,
  bundledPackages?: string[]
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
  bundledPackages
}: BundleOptions) {
  const configObjectFullPath = resolve(root, 'api-extractor.json')

  if (!dtsRE.test(fileName)) {
    fileName += '.d.ts'
  }

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      projectFolder: root,
      mainEntryPointFilePath: entryPath,
      bundledPackages,
      compiler: {
        tsconfigFilePath: configPath,
        overrideTsconfig: {
          $schema: 'http://json.schemastore.org/tsconfig',
          compilerOptions
        }
      },
      apiReport: {
        enabled: false
      },
      docModel: {
        enabled: false
      },
      dtsRollup: {
        enabled: true,
        publicTrimmedFilePath: resolve(outDir, fileName)
      },
      tsdocMetadata: {
        enabled: false
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
        }
      }
    },
    configObjectFullPath,
    packageJsonFullPath: tryGetPkgPath(configObjectFullPath)
  })

  const result = Extractor.invoke(extractorConfig, {
    localBuild: false,
    showVerboseMessages: false,
    showDiagnostics: false,
    typescriptCompilerFolder: libFolder ? resolve(libFolder) : undefined
  })

  return result.succeeded
}

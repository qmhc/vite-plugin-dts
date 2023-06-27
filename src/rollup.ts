import { resolve } from 'node:path'
import { ExtractorConfig, CompilerState } from '@microsoft/api-extractor'
import { Collector } from '@microsoft/api-extractor/lib/collector/Collector.js'
import { MessageRouter } from '@microsoft/api-extractor/lib/collector/MessageRouter.js'
import { SourceMapper } from '@microsoft/api-extractor/lib/collector/SourceMapper.js'
import {
  DtsRollupGenerator,
  DtsRollupKind
} from '@microsoft/api-extractor/lib/generators/DtsRollupGenerator.js'
import { PackageJsonLookup } from '@rushstack/node-core-library'

import type { ExtractorLogLevel, IExtractorInvokeOptions } from '@microsoft/api-extractor'
import type ts from 'typescript'

export interface BundleOptions {
  root: string,
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
  compilerOptions,
  outDir,
  entryPath,
  fileName,
  libFolder,
  bundledPackages
}: BundleOptions) {
  const configObjectFullPath = resolve(root, 'api-extractor.json')
  const packageJsonLookup = new PackageJsonLookup()
  const packageJsonFullPath = packageJsonLookup.tryGetPackageJsonFilePathFor(configObjectFullPath)

  if (!dtsRE.test(fileName)) {
    fileName += '.d.ts'
  }

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      projectFolder: root,
      mainEntryPointFilePath: entryPath,
      bundledPackages,
      compiler: {
        // tsconfigFilePath: tsConfigPath,
        overrideTsconfig: {
          $schema: 'http://json.schemastore.org/tsconfig',
          compilerOptions: {
            ...compilerOptions,
            target: 'ESNext'
          }
        }
      },
      apiReport: {
        enabled: false,
        reportFileName: '<unscopedPackageName>.api.md'
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
    packageJsonFullPath
  })

  const compilerState = CompilerState.create(extractorConfig, {
    localBuild: false,
    showVerboseMessages: false,
    typescriptCompilerFolder: libFolder ? resolve(libFolder, '..') : undefined
  } as IExtractorInvokeOptions)

  const sourceMapper = new SourceMapper()

  const messageRouter = new MessageRouter({
    workingPackageFolder: root,
    messageCallback: undefined,
    messagesConfig: extractorConfig.messages as any,
    showVerboseMessages: false,
    showDiagnostics: false,
    tsdocConfiguration: extractorConfig.tsdocConfiguration,
    sourceMapper
  })

  const collector = new Collector({
    program: compilerState.program as any,
    messageRouter,
    extractorConfig: extractorConfig as any,
    sourceMapper
  })

  collector.analyze()

  DtsRollupGenerator.writeTypingsFile(
    collector,
    extractorConfig.publicTrimmedFilePath,
    DtsRollupKind.PublicRelease,
    extractorConfig.newlineKind
  )
}

import { resolve } from 'path'
import { ExtractorConfig, CompilerState } from '@microsoft/api-extractor'
import { Collector } from '@microsoft/api-extractor/lib/collector/Collector'
import { MessageRouter } from '@microsoft/api-extractor/lib/collector/MessageRouter'
import {
  DtsRollupGenerator,
  DtsRollupKind
} from '@microsoft/api-extractor/lib/generators/DtsRollupGenerator'
import { PackageJsonLookup } from '@rushstack/node-core-library'

import type { ExtractorLogLevel, IExtractorInvokeOptions } from '@microsoft/api-extractor'

export interface BundleOptions {
  root: string,
  tsConfigPath: string,
  outputDir: string,
  entryPath: string,
  fileName: string
}

const dtsRE = /\.d\.tsx?$/

export function rollupDeclarationFiles({
  root,
  tsConfigPath,
  outputDir,
  entryPath,
  fileName
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
      compiler: {
        tsconfigFilePath: tsConfigPath
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
        publicTrimmedFilePath: resolve(outputDir, fileName)
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
    configObjectFullPath: configObjectFullPath,
    packageJsonFullPath: packageJsonFullPath
  })

  const compilerState = CompilerState.create(extractorConfig, {
    localBuild: true,
    showVerboseMessages: false
  } as IExtractorInvokeOptions)

  const messageRouter = new MessageRouter({
    workingPackageFolder: root,
    messageCallback: undefined,
    messagesConfig: extractorConfig.messages as any,
    showVerboseMessages: false,
    showDiagnostics: false,
    tsdocConfiguration: extractorConfig.tsdocConfiguration
  })

  const collector = new Collector({
    program: compilerState.program as any,
    messageRouter,
    extractorConfig: extractorConfig as any
  })

  collector.analyze()

  DtsRollupGenerator.writeTypingsFile(
    collector,
    extractorConfig.publicTrimmedFilePath,
    DtsRollupKind.PublicRelease,
    extractorConfig.newlineKind
  )
}

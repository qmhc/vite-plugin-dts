import { tryGetPackageInfo } from './utils'

import type ts from 'typescript'

let hasVue: boolean | undefined

function getHasVue() {
  return typeof hasVue !== 'undefined' ? hasVue : (hasVue = !!tryGetPackageInfo('vue'))
}

export interface ProgramProcesses {
  createParsedCommandLine: (_ts: typeof ts, host: ts.ParseConfigHost, configPath: string) => ts.ParsedCommandLine,
  createProgram: typeof ts.createProgram
}

export async function loadProgramProcesses(): Promise<ProgramProcesses> {
  if (getHasVue()) {
    return await import('./programs/vue')
  }

  return await import('./programs/common')
}

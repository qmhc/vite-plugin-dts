import { resolve, isAbsolute, dirname, normalize, sep } from 'node:path'
import { existsSync, readdirSync, lstatSync, rmdirSync } from 'node:fs'
import typescript from 'typescript'

import type { CompilerOptions } from 'ts-morph'

export function isNativeObj<T extends Record<string, any> = Record<string, any>>(
  value: T
): value is T {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === '[object RegExp]'
}

export function isPromise(value: unknown): value is Promise<any> {
  return (
    !!value &&
    (typeof (value as any) === 'function' || isNativeObj(value)) &&
    typeof (value as any).then === 'function' &&
    typeof (value as any).catch === 'function'
  )
}

export function mergeObjects<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  sourceObj: T,
  targetObj: U
) {
  const loop: Array<{
    source: Record<string, any>
    target: Record<string, any>
    // merged: Record<string, any>
  }> = [
    {
      source: sourceObj,
      target: targetObj
      // merged: mergedObj
    }
  ]

  while (loop.length) {
    const { source, target } = loop.pop()!

    Object.keys(target).forEach(key => {
      if (isNativeObj(target[key])) {
        if (!isNativeObj(source[key])) {
          source[key] = {}
        }

        loop.push({
          source: source[key],
          target: target[key]
        })
      } else if (Array.isArray(target[key])) {
        if (!Array.isArray(source[key])) {
          source[key] = []
        }

        loop.push({
          source: source[key],
          target: target[key]
        })
      } else {
        source[key] = target[key]
      }
    })
  }

  return sourceObj as T & U
}

export function ensureAbsolute(path: string, root: string) {
  return path ? (isAbsolute(path) ? path : resolve(root, path)) : root
}

export function ensureArray<T>(value: T | T[]) {
  return Array.isArray(value) ? value : value ? [value] : []
}

export async function runParallel<T>(
  maxConcurrency: number,
  source: T[],
  iteratorFn: (item: T, source: T[]) => Promise<any>
) {
  const ret: Promise<any>[] = []
  const executing: Promise<any>[] = []

  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item, source))

    ret.push(p)

    if (maxConcurrency <= source.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1))

      executing.push(e)

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }
    }
  }

  return Promise.all(ret)
}

const speRE = /[\\/]/

export function queryPublicPath(paths: string[]) {
  if (paths.length === 0) {
    return ''
  } else if (paths.length === 1) {
    return dirname(paths[0])
  }

  let publicPath = normalize(dirname(paths[0])) + sep
  let publicUnits = publicPath.split(speRE)
  let index = publicUnits.length - 1

  for (const path of paths.slice(1)) {
    if (!index) {
      return publicPath
    }

    const dirPath = normalize(dirname(path)) + sep

    if (dirPath.startsWith(publicPath)) {
      continue
    }

    const units = dirPath.split(speRE)

    if (units.length < index) {
      publicPath = dirPath
      publicUnits = units
      continue
    }

    for (let i = 0; i <= index; ++i) {
      if (publicUnits[i] !== units[i]) {
        if (!i) {
          return ''
        }

        index = i - 1
        publicUnits = publicUnits.slice(0, index + 1)
        publicPath = publicUnits.join(sep) + sep
        break
      }
    }
  }

  return publicPath.slice(0, -1)
}

export function removeDirIfEmpty(dir: string) {
  if (!existsSync(dir)) {
    return
  }

  let onlyHasDir = true

  for (const file of readdirSync(dir)) {
    const abs = resolve(dir, file)

    if (lstatSync(abs).isDirectory()) {
      if (!removeDirIfEmpty(abs)) {
        onlyHasDir = false
      }
    } else {
      onlyHasDir = false
    }
  }

  if (onlyHasDir) {
    rmdirSync(dir)
  }

  return onlyHasDir
}

export function getTsConfig(
  tsConfigPath: string,
  readFileSync: (filePath: string, encoding?: string | undefined) => string
) {
  // #95 Should parse include or exclude from the base config when they are missing from
  // the inheriting config. If the inherit config doesn't have `include` or `exclude` field,
  // should get them from the parent config.
  const tsConfig: {
    compilerOptions: CompilerOptions
    include?: string[]
    exclude?: string[]
    extends?: string | string[]
  } = {
    compilerOptions: {},
    ...(typescript.readConfigFile(tsConfigPath, readFileSync).config ?? {})
  }

  if (tsConfig.extends) {
    ensureArray(tsConfig.extends).forEach((configPath: string) => {
      const config = getTsConfig(ensureAbsolute(configPath, dirname(tsConfigPath)), readFileSync)

      // #171 Need to collect the full `compilerOptions` for `@microsoft/api-extractor`
      Object.assign(tsConfig.compilerOptions, config.compilerOptions)
      if (!tsConfig.include) {
        tsConfig.include = config.include
      }

      if (!tsConfig.exclude) {
        tsConfig.exclude = config.exclude
      }
    })
  }

  return tsConfig
}

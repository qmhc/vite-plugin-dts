import { resolve, isAbsolute } from 'path'

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> ? DeepPartial<T[P]> : T[P]
}

export function isNativeObj<T extends Record<string, any> = Record<string, any>>(
  value: T
): value is T {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === '[object RegExp]'
}

export function mergeObjects<T extends Record<string, unknown>>(
  sourceObj: T,
  targetObj: DeepPartial<T>
) {
  const loop: Array<{
    source: Record<string, any>,
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

  return sourceObj
}

export function ensureAbsolute(path: string, root: string) {
  return path ? (isAbsolute(path) ? path : resolve(root, path)) : root
}

export function ensureArray<T>(value: T | T[]) {
  return Array.isArray(value) ? value : value ? [value] : []
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> ? DeepPartial<T[P]> : T[P]
}

export function isNativeObj(value: any): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
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

/* eslint-disable prefer-regex-literals */
/* eslint-disable promise/param-names */

import { resolve, normalize } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  isNativeObj,
  isRegExp,
  isPromise,
  mergeObjects,
  ensureAbsolute,
  ensureArray,
  queryPublicPath
} from '../src/utils'

describe('utils tests', () => {
  it('test: normalizePath', () => {
    expect(normalizePath('a')).toEqual('a')
    expect(normalizePath('/a/b/c')).toEqual('/a/b/c')
    expect(normalizePath('\\a\\b\\c')).toEqual('/a/b/c')
    expect(normalizePath('a/b\\c')).toEqual('a/b/c')
    expect(normalizePath('D:\\\\a/b\\c')).toEqual('D:/a/b/c')
    expect(normalizePath('./b\\c')).toEqual('b/c')
    expect(normalizePath('..\\b/c')).toEqual('../b/c')
  })

  it('test: isNativeObj', () => {
    expect(isNativeObj({})).toBe(true)
    expect(isNativeObj([])).toBe(false)
    expect(isNativeObj('' as any)).toBe(false)
  })

  it('test: isRegExp', () => {
    expect(isRegExp('')).toBe(false)
    expect(isRegExp(/1/)).toBe(true)
    expect(isRegExp(new RegExp(''))).toBe(true)
    expect(isRegExp({})).toBe(false)
  })

  it('test: isPromise', () => {
    expect(isPromise(false)).toBe(false)
    expect(isPromise('')).toBe(false)
    expect(
      isPromise(
        new Promise<void>(r => {
          r()
        })
      )
    ).toBe(true)
    expect(isPromise({ then: () => {} })).toBe(true)
    expect(isPromise({ catch: () => {} })).toBe(false)
    expect(isPromise({ then: () => {}, catch: () => {} })).toBe(true)
  })

  it('test: mergeObjects', () => {
    expect(mergeObjects({ a: '1' }, { b: '3' })).toEqual({ a: '1', b: '3' })
    expect(mergeObjects({ a: '1', b: '2' }, { b: '3' })).toEqual({ a: '1', b: '3' })
    expect(mergeObjects({ a: '1', b: '2' }, { b: ['3'] })).toEqual({ a: '1', b: ['3'] })
    expect(mergeObjects({ a: '1', b: { c: '2' } }, { b: { d: '4' } })).toEqual({
      a: '1',
      b: { c: '2', d: '4' }
    })
    expect(mergeObjects({ a: '1', b: 1 }, { b: { d: '4' } })).toEqual({ a: '1', b: { d: '4' } })
  })

  it('test: ensureAbsolute', () => {
    const root = normalizePath(resolve(__dirname, '..'))

    expect(ensureAbsolute('', root)).toBe(root)
    expect(ensureAbsolute('./src/index.ts', root)).toBe(
      normalizePath(resolve(root, 'src/index.ts'))
    )
    expect(ensureAbsolute('/src/index.ts', root)).toBe('/src/index.ts')
    expect(ensureAbsolute('/vite-plugin-dts', root)).toBe('/vite-plugin-dts')
  })

  it('test: ensureArray', () => {
    expect(ensureArray(1)).toEqual([1])
    expect(ensureArray({ a: 1 })).toEqual([{ a: 1 }])
    expect(ensureArray([1, 2])).toEqual([1, 2])
  })

  it('test: queryPublicPath', () => {
    const n = <T extends string | string[]>(p: T) =>
      (Array.isArray(p) ? p.map(normalize) : normalize(p)) as T

    expect(queryPublicPath([])).toBe('')
    expect(queryPublicPath(n(['/project/src/test/a.d.ts', '/project/src/test/b.d.ts']))).toBe(
      n('/project/src/test')
    )
    expect(
      queryPublicPath(
        n(['/project/src/test/a.d.ts', '/project/src/test/b.d.ts', '/project/src/c.d.ts'])
      )
    ).toBe(n('/project/src'))
    expect(
      queryPublicPath(
        n(['/project/src/common/a.d.ts', '/project/src/test/b.d.ts', '/project/src/test/c.d.ts'])
      )
    ).toBe(n('/project/src'))
    expect(
      queryPublicPath(
        n(['/project/src/test/a.d.ts', '/project/src/test1/b.d.ts', '/project/src/test/c.d.ts'])
      )
    ).toBe(n('/project/src'))
  })
})

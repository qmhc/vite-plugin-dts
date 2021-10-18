import { resolve } from 'path'
import {
  isNativeObj,
  isRegExp,
  isPromise,
  mergeObjects,
  ensureAbsolute,
  ensureArray
} from '../src/utils'

describe('utils tests', () => {
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
    expect(isPromise({ then: () => {} })).toBe(false)
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
    const root = resolve(__dirname, '..')

    expect(ensureAbsolute('', root)).toBe(root)
    expect(ensureAbsolute('./src/index.ts', root)).toBe(resolve(root, 'src/index.ts'))
    expect(ensureAbsolute('/src/index.ts', root)).toBe('/src/index.ts')
    expect(ensureAbsolute('E:/vite-plugin-dts', root)).toBe('E:/vite-plugin-dts')
  })

  it('test: ensureArray', () => {
    expect(ensureArray(1)).toEqual([1])
    expect(ensureArray({ a: 1 })).toEqual([{ a: 1 }])
    expect(ensureArray([1, 2])).toEqual([1, 2])
  })
})

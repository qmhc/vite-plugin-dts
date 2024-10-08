import { normalize, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  base64VLQEncode,
  ensureAbsolute,
  ensureArray,
  getTsLibFolder,
  isNativeObj,
  isPromise,
  isRegExp,
  mergeObjects,
  normalizePath,
  parseTsAliases,
  queryPublicPath,
  toCapitalCase,
  unwrapPromise
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

  it('test: unwrapPromise', async () => {
    expect(await unwrapPromise(false)).toBe(false)
    expect(await unwrapPromise('')).toBe('')
    expect(await unwrapPromise(Promise.resolve().then(() => 1))).toBe(1)
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

  it('test: base64VLQEncode', () => {
    // prettier-ignore
    const snapshots = [
      '/P', '9P', '7P', '5P', '3P', '1P', 'zP', 'xP', 'vP', 'tP', 'rP', 'pP', 'nP', 'lP', 'jP', 'hP',
      '/O', '9O', '7O', '5O', '3O', '1O', 'zO', 'xO', 'vO', 'tO', 'rO', 'pO', 'nO', 'lO', 'jO', 'hO',
      '/N', '9N', '7N', '5N', '3N', '1N', 'zN', 'xN', 'vN', 'tN', 'rN', 'pN', 'nN', 'lN', 'jN', 'hN',
      '/M', '9M', '7M', '5M', '3M', '1M', 'zM', 'xM', 'vM', 'tM', 'rM', 'pM', 'nM', 'lM', 'jM', 'hM',
      '/L', '9L', '7L', '5L', '3L', '1L', 'zL', 'xL', 'vL', 'tL', 'rL', 'pL', 'nL', 'lL', 'jL', 'hL',
      '/K', '9K', '7K', '5K', '3K', '1K', 'zK', 'xK', 'vK', 'tK', 'rK', 'pK', 'nK', 'lK', 'jK', 'hK',
      '/J', '9J', '7J', '5J', '3J', '1J', 'zJ', 'xJ', 'vJ', 'tJ', 'rJ', 'pJ', 'nJ', 'lJ', 'jJ', 'hJ',
      '/I', '9I', '7I', '5I', '3I', '1I', 'zI', 'xI', 'vI', 'tI', 'rI', 'pI', 'nI', 'lI', 'jI', 'hI',
      '/H', '9H', '7H', '5H', '3H', '1H', 'zH', 'xH', 'vH', 'tH', 'rH', 'pH', 'nH', 'lH', 'jH', 'hH',
      '/G', '9G', '7G', '5G', '3G', '1G', 'zG', 'xG', 'vG', 'tG', 'rG', 'pG', 'nG', 'lG', 'jG', 'hG',
      '/F', '9F', '7F', '5F', '3F', '1F', 'zF', 'xF', 'vF', 'tF', 'rF', 'pF', 'nF', 'lF', 'jF', 'hF',
      '/E', '9E', '7E', '5E', '3E', '1E', 'zE', 'xE', 'vE', 'tE', 'rE', 'pE', 'nE', 'lE', 'jE', 'hE',
      '/D', '9D', '7D', '5D', '3D', '1D', 'zD', 'xD', 'vD', 'tD', 'rD', 'pD', 'nD', 'lD', 'jD', 'hD',
      '/C', '9C', '7C', '5C', '3C', '1C', 'zC', 'xC', 'vC', 'tC', 'rC', 'pC', 'nC', 'lC', 'jC', 'hC',
      '/B', '9B', '7B', '5B', '3B', '1B', 'zB', 'xB', 'vB', 'tB', 'rB', 'pB', 'nB', 'lB', 'jB', 'hB',
      'f', 'd', 'b', 'Z', 'X', 'V', 'T', 'R', 'P', 'N', 'L', 'J', 'H', 'F', 'D', 'A', 'C', 'E', 'G',
      'I', 'K', 'M', 'O', 'Q', 'S', 'U', 'W', 'Y', 'a', 'c', 'e', 'gB', 'iB', 'kB', 'mB', 'oB', 'qB',
      'sB', 'uB', 'wB', 'yB', '0B', '2B', '4B', '6B', '8B', '+B', 'gC', 'iC', 'kC', 'mC', 'oC', 'qC',
      'sC', 'uC', 'wC', 'yC', '0C', '2C', '4C', '6C', '8C', '+C', 'gD', 'iD', 'kD', 'mD', 'oD', 'qD',
      'sD', 'uD', 'wD', 'yD', '0D', '2D', '4D', '6D', '8D', '+D', 'gE', 'iE', 'kE', 'mE', 'oE', 'qE',
      'sE', 'uE', 'wE', 'yE', '0E', '2E', '4E', '6E', '8E', '+E', 'gF', 'iF', 'kF', 'mF', 'oF', 'qF',
      'sF', 'uF', 'wF', 'yF', '0F', '2F', '4F', '6F', '8F', '+F', 'gG', 'iG', 'kG', 'mG', 'oG', 'qG',
      'sG', 'uG', 'wG', 'yG', '0G', '2G', '4G', '6G', '8G', '+G', 'gH', 'iH', 'kH', 'mH', 'oH', 'qH',
      'sH', 'uH', 'wH', 'yH', '0H', '2H', '4H', '6H', '8H', '+H', 'gI', 'iI', 'kI', 'mI', 'oI', 'qI',
      'sI', 'uI', 'wI', 'yI', '0I', '2I', '4I', '6I', '8I', '+I', 'gJ', 'iJ', 'kJ', 'mJ', 'oJ', 'qJ',
      'sJ', 'uJ', 'wJ', 'yJ', '0J', '2J', '4J', '6J', '8J', '+J', 'gK', 'iK', 'kK', 'mK', 'oK', 'qK',
      'sK', 'uK', 'wK', 'yK', '0K', '2K', '4K', '6K', '8K', '+K', 'gL', 'iL', 'kL', 'mL', 'oL', 'qL',
      'sL', 'uL', 'wL', 'yL', '0L', '2L', '4L', '6L', '8L', '+L', 'gM', 'iM', 'kM', 'mM', 'oM', 'qM',
      'sM', 'uM', 'wM', 'yM', '0M', '2M', '4M', '6M', '8M', '+M', 'gN', 'iN', 'kN', 'mN', 'oN', 'qN',
      'sN', 'uN', 'wN', 'yN', '0N', '2N', '4N', '6N', '8N', '+N', 'gO', 'iO', 'kO', 'mO', 'oO', 'qO',
      'sO', 'uO', 'wO', 'yO', '0O', '2O', '4O', '6O', '8O', '+O', 'gP', 'iP', 'kP', 'mP', 'oP', 'qP',
      'sP', 'uP', 'wP', 'yP', '0P', '2P', '4P', '6P', '8P', '+P'
    ]

    for (let i = 0, len = snapshots.length; i < len; ++i) {
      expect(base64VLQEncode([i - 255])).toEqual(snapshots[i])
    }
  })

  it('test: parseTsAliases', () => {
    const maybeWindowsPath = (path: string) =>
      new RegExp('^([a-zA-Z]:)?' + path.replace('$', '\\$'))

    expect(
      parseTsAliases('/tmp/fake/project/root', {
        '@/*': ['./at/*']
      })
    ).toStrictEqual([
      {
        find: /^@\/(.+)$/,
        replacement: expect.stringMatching(maybeWindowsPath('/tmp/fake/project/root/at/$1'))
      }
    ])

    expect(parseTsAliases('/tmp/fake/project/root', { '~/*': ['./tilde/*'] })).toStrictEqual([
      {
        find: /^~\/(.+)$/,
        replacement: expect.stringMatching(maybeWindowsPath('/tmp/fake/project/root/tilde/$1'))
      }
    ])

    expect(
      parseTsAliases('/tmp/fake/project/root', { '@/no-dot-prefix/*': ['no-dot-prefix/*'] })
    ).toStrictEqual([
      {
        find: /^@\/no-dot-prefix\/(.+)$/,
        replacement: expect.stringMatching(
          maybeWindowsPath('/tmp/fake/project/root/no-dot-prefix/$1')
        )
      }
    ])

    expect(
      parseTsAliases('/tmp/fake/project/root', { '@/components/*': ['./at/components/*'] })
    ).toStrictEqual([
      {
        find: /^@\/components\/(.+)$/,
        replacement: expect.stringMatching(
          maybeWindowsPath('/tmp/fake/project/root/at/components/$1')
        )
      }
    ])

    expect(parseTsAliases('/tmp/fake/project/root', { 'top/*': ['./top/*'] })).toStrictEqual([
      {
        find: /^top\/(.+)$/,
        replacement: expect.stringMatching(maybeWindowsPath('/tmp/fake/project/root/top/$1'))
      }
    ])

    expect(parseTsAliases('/tmp/fake/project/root', { '@src': ['./src'] })).toStrictEqual([
      {
        find: /^@src$/,
        replacement: expect.stringMatching(maybeWindowsPath('/tmp/fake/project/root/src'))
      }
    ])

    // https://github.com/qmhc/vite-plugin-dts/issues/330
    expect(parseTsAliases('/tmp/fake/project/root', { '*': ['./src/*'] })).toStrictEqual([
      {
        find: /^(.+)$/,
        replacement: expect.stringMatching(maybeWindowsPath('/tmp/fake/project/root/src/$1'))
      }
    ])

    // https://github.com/qmhc/vite-plugin-dts/issues/290#issuecomment-1872495764
    expect(parseTsAliases('/tmp/fake/project/root', { '#*': ['./hashed/*'] })).toStrictEqual([
      {
        find: /^#(.+)$/,
        replacement: expect.stringMatching(maybeWindowsPath('/tmp/fake/project/root/hashed/$1'))
      }
    ])
  })

  it('test: toCapitalCase', () => {
    expect(toCapitalCase('abc')).toEqual('Abc')
    expect(toCapitalCase('aa-bb-cc')).toEqual('AaBbCc')
    expect(toCapitalCase('aa_bb_cc')).toEqual('Aa_bb_cc')
    expect(toCapitalCase('_aa-bb-cc')).toEqual('_aaBbCc')
    expect(toCapitalCase('aa--bb')).toEqual('AaBb')
    expect(toCapitalCase('aa bb cc')).toEqual('AaBbCc')
    expect(toCapitalCase('aa -bb- cc')).toEqual('AaBbCc')
    expect(toCapitalCase(' aa bb cc')).toEqual('AaBbCc')
    expect(toCapitalCase(' aa bb cc ')).toEqual('AaBbCc')
    expect(toCapitalCase('-aa bb cc ')).toEqual('AaBbCc')
    expect(toCapitalCase(' -aa bb cc -')).toEqual('AaBbCc')
  })

  it('test: getTsLibFolder', () => {
    expect(getTsLibFolder()).toMatch(/node_modules\/typescript$/)

    expect(existsSync(getTsLibFolder() || '')).toBe(true)
  })
})

import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { hasExportDefault, normalizeGlob, transformCode } from '../src/transform'

import type { Alias } from 'vite'

describe('transform tests', () => {
  it('test: normalizeGlob', () => {
    expect(normalizeGlob('')).toEqual('/**')
    expect(normalizeGlob('/')).toEqual('/**')
    expect(normalizeGlob('.')).toEqual('./**')
    expect(normalizeGlob('..')).toEqual('../**')
    expect(normalizeGlob('../..')).toEqual('../../**')
    expect(normalizeGlob('a/b')).toEqual('a/b/**')
    expect(normalizeGlob('a/b/')).toEqual('a/b/**')
    expect(normalizeGlob('a/.b')).toEqual('a/.b')
    expect(normalizeGlob('a/b.c')).toEqual('a/b.c')
    expect(normalizeGlob('**/*')).toEqual('**/*')
    expect(normalizeGlob('a/b*')).toEqual('a/b*/**')
    expect(normalizeGlob('a/*')).toEqual('a/*')
    expect(normalizeGlob('a/**')).toEqual('a/**')
  })

  it('test: transformCode (dynamic imports to static)', () => {
    const options = (content: string) => ({
      content,
      filePath: '',
      aliases: [],
      aliasesExclude: [],
      staticImport: true,
      clearPureImport: false,
      cleanVueFileName: false
    })

    expect(
      transformCode(options('let data: import("vexip-ui/lib/tree").InitDataOptions[];')).content
    ).toEqual("import { InitDataOptions } from 'vexip-ui/lib/tree';\nlet data: InitDataOptions[];")

    expect(
      transformCode(
        options(
          'declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin>;\nexport default _default;\n'
        )
      ).content
    ).toEqual(
      "import { DefineComponent, ComponentOptionsMixin } from 'vue';\ndeclare const _default: DefineComponent<{}, {}, {}, {}, {}, ComponentOptionsMixin>;\nexport default _default;\n"
    )

    expect(
      transformCode(
        options('let a: A<B<C> & {} & {} & import("vue").ComponentCustomProperties) | null>;')
      ).content
    ).toEqual(
      "import { ComponentCustomProperties } from 'vue';\nlet a: A<B<C> & {} & {} & ComponentCustomProperties) | null>;"
    )

    expect(
      transformCode(
        options(
          'declare const _default: import("./Service").ServiceConstructor<import("./Service").default>;'
        )
      ).content
    ).toEqual(
      "import { ServiceConstructor, default as __DTS_DEFAULT_0__ } from './Service';\ndeclare const _default: ServiceConstructor<__DTS_DEFAULT_0__>;"
    )

    expect(
      transformCode(options('import { Type } from "./test";\nconst test: import("./test").Test;'))
        .content
    ).toEqual("import { Type, Test } from './test';\nconst test: Test;")

    expect(
      transformCode(options("const a: import('foo').A<{ b: import('foo').B<import('foo').C> }>"))
        .content
    ).toEqual("import { A, B, C } from 'foo';\nconst a: A<{ b: B<C> }>")

    expect(
      transformCode(options("function d(param: import('foo').E): import('foo').F")).content
    ).toEqual("import { E, F } from 'foo';\nfunction d(param: E): F")
  })

  it('test: transformCode (process aliases)', () => {
    const aliases: Alias[] = [
      { find: /^@\/(.+)/, replacement: resolve(__dirname, '../$1') },
      { find: /^@components\/(.+)/, replacement: resolve(__dirname, '../src/components/$1') },
      { find: /^~\//, replacement: resolve(__dirname, '../src/') },
      { find: '$src', replacement: resolve(__dirname, '../src') }
    ]
    const filePath = resolve(__dirname, '../src/index.ts')
    const options = (content: string) => ({
      content,
      filePath,
      aliases,
      aliasesExclude: [],
      staticImport: false,
      clearPureImport: false,
      cleanVueFileName: false
    })

    expect(transformCode(options('import type { TestBase } from "@/src/test";')).content).toEqual(
      "import { TestBase } from './test';\n"
    )

    expect(transformCode(options('import("@/components/test").Test;')).content).toEqual(
      "import('../components/test').Test;"
    )
    expect(
      transformCode(options('import type { TestBase } from "@/components/test";')).content
    ).toEqual("import { TestBase } from '../components/test';\n")

    expect(transformCode(options('import("@/components/test").Test;\n')).content).toEqual(
      "import('../components/test').Test;\n"
    )

    expect(
      transformCode(
        options('import VContainer from "@components/layout/container/VContainer.vue";')
      ).content
    ).toEqual(
      "import { default as VContainer } from './components/layout/container/VContainer.vue';\n"
    )

    expect(transformCode(options('import type { TestBase } from "~/test";')).content).toEqual(
      "import { TestBase } from './test';\n"
    )

    expect(transformCode(options('import type { TestBase } from "$src/test";')).content).toEqual(
      "import { TestBase } from './test';\n"
    )

    expect(
      transformCode(
        options("const a: import('~/test').A<{ b: import('~/test').B<import('~/test').C> }>")
      ).content
    ).toEqual("const a: import('./test').A<{ b: import('./test').B<import('./test').C> }>")

    expect(
      transformCode(options("function d(param: import('~/test').E): import('~/test').F")).content
    ).toEqual("function d(param: import('./test').E): import('./test').F")
  })

  it('test: transformCode (remove pure imports)', () => {
    const options = (content: string) => ({
      content,
      filePath: '',
      aliases: [],
      aliasesExclude: [],
      staticImport: false,
      clearPureImport: true,
      cleanVueFileName: false
    })

    expect(transformCode(options('import "@/themes/common.scss";')).content).toEqual('')
    expect(
      transformCode(options('import "@/themes/common.scss";\nimport type { Ref } from "vue";'))
        .content
    ).toEqual("import { Ref } from 'vue';\n")
    expect(
      transformCode(options("{ 'database-import': import('vue').FunctionalComponent }")).content
    ).toEqual("{ 'database-import': import('vue').FunctionalComponent }")
  })

  it('test: transformCode (clean .vue)', () => {
    const options = (content: string) => ({
      content,
      filePath: '',
      aliases: [],
      aliasesExclude: [],
      staticImport: false,
      clearPureImport: false,
      cleanVueFileName: true
    })

    expect(transformCode(options('import { App } from "./App.vue";')).content).toEqual(
      "import { App } from './App';\n"
    )
    expect(
      transformCode(options('import { App } "./App.vue";\nimport { foo } from "./foo.vue";'))
        .content
    ).toEqual("import { App } from './App';\nimport { foo } from './foo';\n")
    expect(transformCode(options("export * from './abc.vue'")).content).toEqual(
      "export * from './abc'"
    )
    expect(
      transformCode(options("const foo: import('./foo.vue').Foo<import('./baz.vue').Baz[]>"))
        .content
    ).toEqual("const foo: import('./foo').Foo<import('./baz').Baz[]>")
  })

  it('test: hasExportDefault', () => {
    expect(hasExportDefault("export { sdk as default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { foo, sdk as default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk as default, baz } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { foo, sdk as default, baz } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { foo as sdk, sdk as default, baz } from './sdk'")).toBe(true)
    expect(hasExportDefault('export { sdk as default } from "./sdk"')).toBe(true)
    expect(hasExportDefault("export {sdk as default} from './sdk'")).toBe(true)
    expect(hasExportDefault("export{sdk as default}from'./sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk  as  default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { foo, sdk } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { foo as baz, sdk } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk, default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk, default as baz } from './sdk'")).toBe(false)
    expect(hasExportDefault('export default class Test {}')).toBe(true)
    expect(hasExportDefault('export class Test {}')).toBe(false)
    expect(hasExportDefault('export default function test() {}')).toBe(true)
    expect(hasExportDefault('export function test() {}')).toBe(false)
    expect(hasExportDefault('const a = 1\nexport default a')).toBe(true)
    expect(hasExportDefault('const a = 1\nexport { a }')).toBe(false)
    expect(hasExportDefault('const a = 1\nexport { a as default }')).toBe(true)
  })
})

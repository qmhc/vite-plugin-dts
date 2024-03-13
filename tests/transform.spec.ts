// import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { hasExportDefault, normalizeGlob, transformCode } from '../src/transform'

// import type { Alias } from 'vite'

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
      clearPureImport: false
    })

    expect(
      transformCode(options('let data: import("vexip-ui/lib/tree").InitDataOptions[];'))
    ).toEqual("import { InitDataOptions } from 'vexip-ui/lib/tree';\nlet data: InitDataOptions[];")

    expect(
      transformCode(
        options(
          'declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin>;\nexport default _default;\n'
        )
      )
    ).toEqual(
      "import { DefineComponent, ComponentOptionsMixin } from 'vue';\ndeclare const _default: DefineComponent<{}, {}, {}, {}, {}, ComponentOptionsMixin>;\nexport default _default;\n"
    )

    expect(
      transformCode(
        options('let a: A<B<C> & {} & {} & import("vue").ComponentCustomProperties) | null>;')
      )
    ).toEqual(
      "import { ComponentCustomProperties } from 'vue';\nlet a: A<B<C> & {} & {} & ComponentCustomProperties) | null>;"
    )

    expect(
      transformCode(
        options(
          'declare const _default: import("./Service").ServiceConstructor<import("./Service").default>;'
        )
      )
    ).toEqual(
      "import { ServiceConstructor, default as __DTS_DEFAULT_0__ } from './Service';\ndeclare const _default: ServiceConstructor<__DTS_DEFAULT_0__>;"
    )

    expect(
      transformCode(options('import { Type } from "./test";\nconst test: import("./test").Test;'))
    ).toEqual("import { Type, Test } from './test';\n\nconst test: Test;")
  })

  // it('test: transformAliasImport', () => {
  //   const aliases: Alias[] = [
  //     { find: /^@\/(.+)/, replacement: resolve(__dirname, '../$1') },
  //     { find: /^@components\/(.+)/, replacement: resolve(__dirname, '../src/components/$1') },
  //     { find: /^~\//, replacement: resolve(__dirname, '../src/') },
  //     { find: '$src', replacement: resolve(__dirname, '../src') }
  //   ]
  //   const filePath = resolve(__dirname, '../src/index.ts')

  //   expect(
  //     transformAliasImport(filePath, 'import type { TestBase } from "@/src/test";\n', aliases)
  //   ).toEqual("import type { TestBase } from './test';\n")

  //   expect(transformAliasImport(filePath, 'import("@/components/test").Test;\n', aliases)).toEqual(
  //     "import('../components/test').Test;\n"
  //   )
  //   expect(
  //     transformAliasImport(
  //       filePath,
  //       'import type { TestBase } from "@/components/test";\n',
  //       aliases
  //     )
  //   ).toEqual("import type { TestBase } from '../components/test';\n")

  //   expect(transformAliasImport(filePath, 'import("@/components/test").Test;\n', aliases)).toEqual(
  //     "import('../components/test').Test;\n"
  //   )

  //   expect(
  //     transformAliasImport(
  //       filePath,
  //       'import VContainer from "@components/layout/container/VContainer.vue";\n',
  //       aliases
  //     )
  //   ).toEqual("import VContainer from './components/layout/container/VContainer.vue';\n")

  //   expect(
  //     transformAliasImport(filePath, 'import type { TestBase } from "~/test";\n', aliases)
  //   ).toEqual("import type { TestBase } from './test';\n")

  //   expect(
  //     transformAliasImport(filePath, 'import type { TestBase } from "$src/test"', aliases)
  //   ).toEqual("import type { TestBase } from './test'")
  // })

  it('test: transformCode (remove pure imports)', () => {
    const options = (content: string) => ({
      content,
      filePath: '',
      aliases: [],
      aliasesExclude: [],
      staticImport: false,
      clearPureImport: true
    })

    expect(transformCode(options('import "@/themes/common.scss";'))).toEqual('')
    expect(
      transformCode(options('import "@/themes/common.scss";\nimport type { Ref } from "vue";'))
    ).toEqual("import { Ref } from 'vue';\n")
    expect(
      transformCode(options("{ 'database-import': import('vue').FunctionalComponent }"))
    ).toEqual("{ 'database-import': import('vue').FunctionalComponent }")
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
    expect(hasExportDefault("export { sdkas, default } from './sdk'")).toBe(true)
  })
})

import './ignore'

import DefaultImport from '@components/DefaultImport.vue'
import type { TestBase } from '@/components/test'

import BothScripts from '@/components/BothScripts.vue'
import JsTest from '@/components/JsTest.vue'
import JsxLangTest from '@/components/JsxLangTest.vue'
import JsxTest from '@/components/JsxTest.jsx'
import TsxLangTest from '@/components/TsxLangTest.vue'
import TsxTest from '@/components/TsxTest'

export interface Test extends TestBase {
  count: number
}

export { addOne, add } from '@/components/js-test.js'

export { default as App } from './App.vue'
export { default as Setup } from '@/components/Setup.vue'
export { test } from '@/components/test'

export type { User } from './types'
export type { DtsType } from './dts-types'
export type { Component } from '@/components'

export { BothScripts, JsTest, JsxLangTest, JsxTest, TsxLangTest, TsxTest }

export default DefaultImport

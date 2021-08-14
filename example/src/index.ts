import './ignore'

import DefaultImport from '@components/DefaultImport.vue'
import type { TestBase } from '@/components/test'

export interface Test extends TestBase {
  count: number
}

export { default as App } from './App.vue'
export { default as Setup } from '@/components/Setup.vue'
export { test } from '@/components/test'

export type { User } from './types'
export type { DtsType } from './dts-types'
export type { Component } from '@/components'

export default DefaultImport

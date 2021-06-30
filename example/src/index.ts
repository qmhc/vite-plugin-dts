import './ignore'

import type { TestBase } from '@/components/test'

export interface Test extends TestBase {
  count: number
}

export { default as App } from './App.vue'
export { default as Setup } from '@/components/Setup.vue'
export { test } from '@/components/test'

export type { User } from './types'
export type { Component } from '@/components'

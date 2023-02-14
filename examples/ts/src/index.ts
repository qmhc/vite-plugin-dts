import type { TestBase } from '@/test'

export interface Test extends TestBase {
  count: number
}

export { testFn } from './comment'
export { Decorator } from './decorator'
export { test, method } from './test'
export { addOne, add } from '@/js-test.js'
export { ESClass } from './es-class'

export type { User } from './types'

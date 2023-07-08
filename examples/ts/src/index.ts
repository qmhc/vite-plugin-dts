import data from './data.json'

import type { TestBase } from '@/test'

export interface Test extends TestBase {
  count: number
}

export { testFn } from './comment'
export { Decorator } from './decorator'
export { addOne, add } from '@/js-test.js'
export { ESClass } from './es-class'
export { manualDts } from './manual-dts'

export { ParametersTest, test, method } from './test'

export { data }

export type { User } from './types'
export type { AliasType } from '@alias/type'

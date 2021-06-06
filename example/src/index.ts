import App from './App.vue'
import type { TestBase } from '@/components/test'

export interface Test extends TestBase {
  count: number
}

export { App }
export { test } from '@/components/test'

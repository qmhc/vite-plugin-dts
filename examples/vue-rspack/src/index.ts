import './ignore'

import BothScripts from '@/components/BothScripts.vue'
import JsTest from '@/components/JsTest.vue'
import TypeProps from '@/components/TypeProps.vue'
import NoScript from '@/components/NoScript.vue'
import OutsideProps from '@/components/outside-props'
import NoDirectExport from '@/components/NoDirectExport.vue'

import OutsideTsProps from '@/components/outside-ts-props'
import GenericProps from '@/components/GenericProps.vue'

import JsSetup from '../components/JsSetup.vue'
import DefaultImport from '@components/DefaultImport.vue'

export { default as App } from './App.vue'
export { default as Setup } from '@/components/Setup.vue'

export const user: import('@/src/types').User = {
  id: '',
  name: '',
}

export type { User } from './types'
export type { DtsType } from './dts-types'
export type * from './modules'

export type { AliasType } from '$alias/type'

export {
  BothScripts,
  JsTest,
  TypeProps,
  NoScript,
  OutsideProps,
  NoDirectExport,
  JsSetup,
  OutsideTsProps,
  GenericProps,
}

export default DefaultImport

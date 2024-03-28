import HelloWorld from './components/HelloWorld'

import type { ReactDOM as MyReactDOM } from 'react'

export { HelloWorld }
export { default as App } from './App'
export * from './modules'

export function test(dom: MyReactDOM) {}

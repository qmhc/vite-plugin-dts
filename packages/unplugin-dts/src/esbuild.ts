import { createEsbuildPlugin } from 'unplugin'
import { pluginFactory } from './plugin'

export default createEsbuildPlugin(pluginFactory)
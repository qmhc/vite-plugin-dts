import { createRollupPlugin } from 'unplugin'
import { pluginFactory } from './plugin'

export default createRollupPlugin(pluginFactory)
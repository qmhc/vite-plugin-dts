import { createVitePlugin } from 'unplugin'
import { pluginFactory } from './plugin'

export default createVitePlugin(pluginFactory)

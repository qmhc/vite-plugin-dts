import minimist from 'minimist'
import { logger, publish } from '@vexip-ui/scripts'
import { rootDir } from './constant'

const args = minimist<{
  d?: boolean,
  dry?: boolean,
  t?: string,
  tag?: string
}>(process.argv.slice(2))

const isDryRun = args.dry || args.d
const releaseTag = args.tag || args.t

publish({
  pkgDir: rootDir,
  isDryRun,
  releaseTag
}).catch(error => {
  logger.error(error)
  process.exit(1)
})
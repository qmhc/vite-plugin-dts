import minimist from 'minimist'
import { logger, release, run } from '@vexip-ui/scripts'
import { rootDir } from './constant'

const args = minimist<{
  d?: boolean,
  dry?: boolean,
  t?: string,
  tag?: string,
  p?: string,
  preid?: string
}>(process.argv.slice(2))

const isDryRun = args.dry || args.d
const preId = args.preid || args.p

release({
  pkgDir: rootDir,
  isDryRun,
  preId,
  gitTag: args.tag || args.t,
  runTest: () => run('pnpm', ['test']),
  runBuild: () => run('pnpm', ['build']),
  runChangelog: () => run('pnpm', ['changelog'])
}).catch(error => {
  logger.error(error)
  process.exit(1)
})

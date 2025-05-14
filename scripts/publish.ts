import { readdir } from 'node:fs/promises'

import { resolve } from 'node:path'

import minimist from 'minimist'
import { logger, publish } from '@vexip-ui/scripts'
import { pkgsDir } from './constant'

const args = minimist<{
  d?: boolean,
  dry?: boolean,
  t?: string,
  tag?: string
}>(process.argv.slice(2))

const isDryRun = args.dry || args.d
const releaseTag = args.tag || args.t

async function main() {
  const packages = await readdir(pkgsDir)

  for (const pkgName of packages) {
    const pkgRoot = resolve(pkgsDir, pkgName)

    await publish({
      pkgDir: pkgRoot,
      isDryRun,
      releaseTag,
    })
  }
}

main().catch(error => {
  logger.error(error)
  process.exit(1)
})

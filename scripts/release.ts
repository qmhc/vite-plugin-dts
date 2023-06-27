import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import minimist from 'minimist'
import { execa } from 'execa'
import semver from 'semver'
import { lightBlue } from 'kolorist'
import prompts from 'prompts'
// @ts-ignore
import { logger } from './logger.ts'

const args = minimist<{
  d?: boolean,
  dry?: boolean,
  t?: string,
  tag?: string,
  p: string,
  preid?: string
}>(process.argv.slice(2))

const isDryRun = args.dry || args.d
const releaseTag = args.tag || args.t

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..')

const run = (bin: string, args: string[], opts: Record<string, any> = {}) => execa(bin, args, { stdio: 'inherit', ...opts })
const dryRun = async (bin: string, args: string[], opts: Record<string, any> = {}) => {
  console.log(lightBlue(`[dryrun] ${bin} ${args.join(' ')}`), opts)
}
const runIfNotDry = isDryRun ? dryRun : run
const logStep = (msg: string) => {
  logger.ln()
  logger.infoText(msg)
}
const logSkipped = (msg = 'Skipped') => {
  logger.warningText(`(${msg})`)
}

main()

async function main() {
  const pkg = JSON.parse(
    await readFile(path.join(rootDir, 'package.json'), 'utf-8')
  )
  const currentVersion = pkg.version

  const preId =
    args.preid ||
    args.p ||
    semver.prerelease(currentVersion)?.[0]

  const versionIncrements = [
    'patch',
    'minor',
    'major',
    ...(preId ? ['prepatch', 'preminor', 'premajor', 'prerelease'] : [])
  ]

  const inc = (i: any) => semver.inc(currentVersion, i, preId as string)

  const { release } = await prompts({
    type: 'select',
    name: 'release',
    message: 'Select release type:',
    choices: versionIncrements
      .map(i => `${i} (${inc(i)})`)
      .concat(['custom'])
      .map(i => ({ title: i, value: i }))
  })

  const version =
    release === 'custom'
      ? (await prompts({
        type: 'text',
        name: 'version',
        message: 'Input custom version:'
      })).version
      : release.match(/\((.*)\)/)?.[1]

  if (!semver.valid(version)) {
    throw new Error(`Invalid target version: ${version}`)
  }

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: `Confirm release ${version}?`
  })

  if (!confirm) return

  // 执行单元测试
  logStep('Running test...')

  if (!isDryRun) {
    await run('pnpm', ['test'])
  } else {
    logSkipped()
  }

  logStep('Updating version...')

  pkg.version = version
  await writeFile(path.resolve(rootDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

  // 构建库
  logStep(`Building package...`)

  if (!isDryRun) {
    await run('pnpm', ['build'])
  } else {
    logSkipped()
  }

  // 更新 Change Log
  logStep('Updating changelog...')

  await run('pnpm', ['changelog'])

  // 提交改动
  logStep('Comitting changes...')

  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })

  if (stdout) {
    await runIfNotDry('git', ['add', '-A'])
    await runIfNotDry('git', ['commit', '-m', `release: v${version}`])
  } else {
    logSkipped('No changes to commit')
  }

  // 发布
  logStep('Publishing package...')

  try {
    await runIfNotDry(
      'npm',
      [
        'publish',
        '--registry=https://registry.npmjs.org/',
        ...(releaseTag ? ['--tag', releaseTag] : [])
      ],
      { stdio: 'pipe' }
    )

    logger.successText(`Successfully published v${version}'`)
  } catch (err: any) {
    if (err.stderr?.match?.(/previously published/)) {
      logger.errorText(`Skipping already published v'${version}'`)
    } else {
      throw err
    }
  }

  // 推送到远程仓库
  logStep('Pushing to Remote Repository...')

  await runIfNotDry('git', ['tag', `v${version}`])
  await runIfNotDry('git', ['push', 'origin', `refs/tags/v${version}`])
  await runIfNotDry('git', ['push'])

  logger.ln()

  if (isDryRun) {
    logger.success('Dry run finished - run git diff to see package changes')
  } else {
    logger.success(`Release successfully`)
  }

  logger.ln()
}

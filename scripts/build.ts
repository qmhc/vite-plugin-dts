import path from 'node:path'
import fs from 'fs-extra'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const root = path.basename(fileURLToPath(import.meta.url))
const bin = (name: string) => path.resolve(root, '../node_modules/.bin/' + name)

async function main() {
  await execa(
    bin('tsup-node'),
    [
      'src/index.ts',
      '--dts',
      '--format',
      'cjs,esm'
    ],
    { stdio: 'inherit' }
  )

  const indexPath = path.resolve(root, '../dist/index.js')

  let indexCodes = await fs.readFile(indexPath, 'utf-8')

  const moduleExportsLine = `module.exports = __toCommonJS(src_exports);`

  if (indexCodes.includes(moduleExportsLine)) {
    const name = 'dtsPlugin'

    indexCodes = indexCodes.replace(
      moduleExportsLine,
      `module.exports = ${name};\n${name}['default'] = ${name};`
    )

    await fs.writeFile(indexPath, indexCodes)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

const fs = require('fs-extra')
const path = require('path')
const execa = require('execa')
// const { logger } = require('./logger')

const bin = name => path.resolve(__dirname, '../node_modules/.bin/' + name)

main()

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

  const indexPath = path.resolve(__dirname, '../dist/index.js')

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

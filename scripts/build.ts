import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const root = path.basename(fileURLToPath(import.meta.url))
const bin = (name: string) => path.resolve(root, '../node_modules/.bin/' + name)

async function main() {
  await execa(
    bin('unbuild'),
    [],
    { stdio: 'inherit' }
  )

  await patchCommomJs()
  await patchESModule()
}

async function patchCommomJs() {
  const indexPath = path.resolve(root, '../dist/index.cjs')

  let indexCodes = await readFile(indexPath, 'utf-8')

  const moduleExportsLine = `module.exports = __toCommonJS(src_exports);`

  if (indexCodes.includes(moduleExportsLine)) {
    const name = 'dtsPlugin'

    indexCodes = indexCodes.replace(
      moduleExportsLine,
      `module.exports = ${name};\n${name}['default'] = ${name};`
    )

    await writeFile(indexPath, indexCodes)
  }
}

const cjsBridge = `
import __cjs_url__ from 'url';
import __cjs_path__ from 'path';
import __cjs_mod__ from 'module';
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require = __cjs_mod__.createRequire(import.meta.url);
`

async function patchESModule() {
  const indexPath = path.resolve(root, '../dist/index.mjs')

  let indexCodes = await readFile(indexPath, 'utf-8')
  indexCodes = cjsBridge + indexCodes

  await writeFile(indexPath, indexCodes)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

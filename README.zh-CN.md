# vite-plugin-dts

**中文** | [English](./README.md)

一款用于从 `.ts` 或 `.vue` 源文件生成 `.d.ts` 文件的 Vite 插件。

## 安装

```sh
yarn add vite-plugin-dts -D
```

## 使用

```ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      formats: ['es'],
      fileName: 'my-lib'
    }
  },
  plugins: [dts()]
})
```

## 选项

```ts
import type { ts, Diagnostic } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string
  content?: string
}

export interface PluginOptions {
  // 执行的根目录
  // 默认基于 vite 配置的 root 选项
  root?: string

  // 声明文件的输出目录
  // 默认基于 vite 配置的输出目录
  outputDir?: string

  // 提供给 ts-morph Project 初始化的 compilerOptions 选项
  // 默认值: null
  compilerOptions?: ts.CompilerOptions | null

  // 提供给 ts-morph Project 初始化的 tsconfig.json 路径
  // 插件也会读取 tsconfig.json 的 incldue 和 exclude 选项来解析文件
  // 默认值: 'tsconfig.json'
  tsConfigFilePath?: string

  // 是否将 '.vue.d.ts' 文件名转换为 '.d.ts'
  // 默认值: false
  cleanVueFileName?: boolean

  //是否将动态引入转换为静态
  // eg. 'import('vue').DefineComponent' 转换为 'import { DefineComponent } from "vue"'
  // 默认值: false
  staticImport?: boolean

  // 手动设置包含路径的 glob
  // 默认基于 tsconfig.json 的 include 选项
  include?: string | string[]

  // 手动设置排除路径的 glob
  // 默认基于 tsconfig.json 的 exclude 选线，未设置时为 'node_module/**'
  exclude?: string | string[]

  // 是否生成类型声明入口
  // 当为 true 时会基于 package.json 的 tpyes 字段生成，或者 `${outputDir}/index.d.ts`
  // 默认值: false
  insertTypesEntry?: boolean

  // 是否将源码里的 .d.ts 文件复制到 outputDir
  // 默认值: true
  copyDtsFiles?: boolean

  // 出现类型诊断信息时不生成类型文件
  // 默认值: false
  noEmitOnError?: boolean

  // 是否打印类型诊断信息
  // 默认值: false
  logDiagnostics?: boolean

  // 获取诊断信息后的钩子
  // 可以根据参数 length 来判断有误类型错误
  // 默认值: () => {}
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void

  // 类型声明文件被写入前的钩子
  // 可以在钩子里转换文件路径和文件内容
  // 默认值: () => {}
  beforeWriteFile?: (filePath: string, content: string) => void | TransformWriteFile
}
```

## Example

克隆项目然后执行下列命令：

```sh
yarn run test:e2e
```

然后检查 `example/types` 目录。

## 授权

MIT License

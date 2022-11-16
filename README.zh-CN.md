<h1 align="center">vite-plugin-dts</h1>

<p align="center">
  一款用于在 <a href="https://cn.vitejs.dev/guide/build.html#library-mode">库模式</a> 中从 <code>.ts(x)</code> 或 <code>.vue</code> 源文件生成类型文件（<code>*.d.ts</code>）的 vite 插件。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-dts">
    <img src="https://img.shields.io/npm/v/vite-plugin-dts?color=orange&label=" alt="version" />
  </a>
</p>

<p align="center">
  <strong>中文</strong> | <a href="./README.md">English</a>
</p>

<p align="center"><strong>注意：</strong>从 1.7.0 开始 <code>skipDiagnostics</code> 选项默认为 <code>false</code>。</p>

<br />

## 安装

```sh
pnpm add vite-plugin-dts -D
```

## 使用

在 `vite.config.ts`:

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

在你的组件中:

```vue
<template>
  <div></div>
</template>

<script lang="ts">
// 使用 defineComponent 来进行类型推断
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Component'
})
</script>
```

```vue
<script setup lang="ts">
// 尽管没有直接使用 props，你仍需要接收 defineProps 的返回值
const props = defineProps<{
  color: 'blue' | 'red'
}>()
</script>

<template>
  <div>{{ color }}</div>
</template>
```

## 常见问题

此处将收录一些常见的问题并提供一些解决方案。

### 打包后出现类型文件缺失 (`1.7.0` 之前)

默认情况下 `skipDiagnostics` 选项的值为 `true`，这意味着打包过程中将跳过类型检查（一些项目通常有 `vue-tsc` 等的类型检查工具），这时如果出现存在类型错误的文件，并且这是错误会中断打包过程，那么这些文件对应的类型文件将不会被生成。

如果您的项目没有依赖外部的类型检查工具，这时候可以您可以设置 `skipDiagnostics: false` 和 `logDiagnostics: true` 来打开插件的诊断与输出功能，这将帮助您检查打包过程中出现的类型错误并将错误信息输出至终端。

### Vue 组件中同时使用了 `script` 和 `setup-script` 后出现类型错误

这通常是由于分别在 `script` 和 `setup-script` 中同时使用了 `defineComponent` 方法导致的。 `vue/compiler-sfc` 为这类文件编译时会将 `script` 中的默认导出结果合并到 `setup-script` 的 `defineComponent` 的参数定义中，而 `defineComponent` 的参数类型与结果类型并不兼容，这一行为将会导致类型错误。

这是一个简单的[示例](https://github.com/qmhc/vite-plugin-dts/blob/main/example/components/BothScripts.vue)，您应该将位于 `script` 中的 `defineComponent` 方法移除，直接导出一个原始的对象。

### 打包时出现了无法从 `node_modules` 的包中推断类型的错误

这是 TypeScript 通过软链接 (pnpm) 读取 `node_modules` 中过的类型时会出现的一个已知的问题，可以参考这个 [issue](https://github.com/microsoft/TypeScript/issues/42873)，目前已有的一个解决方案，在你的 `tsconfig.json` 中添加 `baseUrl` 以及在 `paths` 添加这些包的路径：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "third-lib": ["node_modules/third-lib"]
    }
  }
}
```

## 选项

```ts
import type { ts, Diagnostic } from 'ts-morph'

interface TransformWriteFile {
  filePath?: string
  content?: string
}

export interface PluginOptions {
  /**
   * 执行的根目录
   *
   * 默认基于 vite 配置的 root 选项
   */
  root?: string

  /**
   * 声明文件的输出目录
   *
   * 可以指定一个数组来输出到多个目录中
   *
   * 默认基于 vite 配置的输出目录
   */
  outputDir?: string | string[]

  /**
   * 用于手动设置入口文件的根路径
   *
   * 在计算每个文件的输出路径时将基于该路径
   *
   * 默认为所有文件的最小公共路径
   */
  entryRoot?: string

  /**
   * 提供给 ts-morph Project 初始化的 compilerOptions 选项
   *
   * @default null
   */
  compilerOptions?: ts.CompilerOptions | null

  /**
   * 提供给 ts-morph Project 初始化的 tsconfig.json 路径
   *
   * 插件也会读取 tsconfig.json 的 incldue 和 exclude 选项来解析文件
   *
   * @default 'tsconfig.json'
   */
  tsConfigFilePath?: string

  /**
   * 设置在转换别名时哪些路径需要排除
   *
   * 如果为正则，会直接使用 test 和原始路径进行比较
   *
   * @default []
   */
  aliasesExclude?: (string | RegExp)[]

  /**
   * 是否将 '.vue.d.ts' 文件名转换为 '.d.ts'
   *
   * @default false
   */
  cleanVueFileName?: boolean

  /**
   * 是否将动态引入转换为静态
   *
   * 当开启打包类型文件时强制为 true
   *
   * 例如将 'import('vue').DefineComponent' 转换为 'import { DefineComponent } from "vue"'
   *
   * @default false
   */
  staticImport?: boolean

  /**
   * 手动设置包含路径的 glob
   *
   * 默认基于 tsconfig.json 的 include 选项
   */
  include?: string | string[]

  /**
   * 手动设置排除路径的 glob
   *
   * 默认基于 tsconfig.json 的 exclude 选线，未设置时为 'node_module/**'
   */
  exclude?: string | string[]

  /**
   * 如果文件内容仅包含 'export {}' 则跳过生成
   *
   * @default true
   */
  clearPureImport?: boolean

  /**
   * 是否生成类型声明入口
   *
   * 当为 true 时会基于 package.json 的 types 字段生成，或者 `${outputDir}/index.d.ts`
   *
   * 当开启打包类型文件时强制为 true
   *
   * @default false
   */
  insertTypesEntry?: boolean

  /**
   * 设置是否在发出类型文件后将其打包
   *
   * 基于 `@microsoft/api-extractor`，由于这开启了一个新的进程，将会消耗一些时间
   *
   * @default false
   */
  rollupTypes?: boolean

  /**
   * 是否将源码里的 .d.ts 文件复制到 outputDir
   *
   * @default true
   */
  copyDtsFiles?: boolean

  /**
   * 出现类型诊断信息时不生成类型文件
   *
   * @default false
   */
  noEmitOnError?: boolean

  /**
   * 是否跳过类型诊断
   *
   * 跳过类型诊断意味着出现错误时不会中断打包进程的执行
   *
   * 但对于出现错误的源文件，将无法生成相应的类型文件
   *
   * @default false
   */
  skipDiagnostics?: boolean

  /**
   * 是否打印类型诊断信息
   *
   * 当跳过类型诊断时该属性将不会生效
   *
   * @deprecated
   * @default false
   */
  logDiagnostics?: boolean

  /**
   * 定制 typescript 的 lib 文件夹路径
   *
   * 应传入一个 root 的相对路径或一个绝对路径
   *
   * @default undefined
   */
  libFolderPath?: string

  /**
   * 获取诊断信息后的钩子
   *
   * 可以根据参数 length 来判断有误类型错误
   *
   * @default () => {}
   */
  afterDiagnostic?: (diagnostics: Diagnostic[]) => void | Promise<void>

  /**
   * 类型声明文件被写入前的钩子
   *
   * 可以在钩子里转换文件路径和文件内容
   *
   * 当返回 false 时会跳过该文件
   *
   * @default () => {}
   */
  beforeWriteFile?: (filePath: string, content: string) => void | false | TransformWriteFile

  /**
   * 构建后回调钩子
   *
   * 将会在所有类型文件被写入后调用
   *
   * @default () => {}
   */
  afterBuild?: () => void | Promise<void>
}
```

## 示例

克隆项目然后执行下列命令：

```sh
pnpm run test:ts
```

然后检查 `examples/ts/types` 目录。

## 授权

MIT 授权。

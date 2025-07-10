<h1 align="center">unplugin-dts</h1>

<p align="center">
  An unplugin that generates declaration files (<code>*.d.ts</code>) from <code>.ts(x)</code> or <code>.vue</code> source files when using <a href="https://vitejs.dev/guide/build.html#library-mode">library mode</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-dts">
    <img src="https://img.shields.io/npm/v/vite-plugin-dts?color=orange&label=" alt="version" />
  </a>
  <a href="https://github.com/qmhc/vite-plugin-dts/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/vite-plugin-dts" alt="license" />
  </a>
</p>

## Installation

```sh
pnpm i -D unplugin-dts
```

## Usage

<details>
  <summary>Vite</summary>

In `vite.config.ts`:

```ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'unplugin-dts/vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      formats: ['es'],
      fileName: 'my-lib',
    }
  },
  plugins: [dts()],
})
```

</details>
<details>
  <summary>Rollup</summary>

In `rollup.config.mjs`:

```ts
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import dts from 'unplugin-dts/rollup'

export default defineConfig({
  input: {
    index: './src/index.ts',
  },
  output: [
    {
      dir: 'dist',
      exports: 'named',
      format: 'esm',
    },
  ],
  plugins: [typescript(), dts()],
})
```

</details>
<details>
  <summary>Rolldown</summary>

In `rolldown.config.mjs`:

```ts
import { defineConfig } from 'rolldown'
import dts from 'unplugin-dts/rolldown'

export default defineConfig({
  input: {
    index: './src/index.ts',
  },
  output: [
    {
      dir: 'dist',
      exports: 'named',
      format: 'esm',
    },
  ],
  plugins: [dts()],
})

```

</details>
<details>
  <summary>Webpack</summary>

In `webpack.config.js`:

```ts
import { resolve } from 'node:path'
import dts from 'unplugin-dts/webpack'

export default {
  entry: {
    index: './src/index.ts',
  },
  output: {
    path: resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [dts()],
}
```

</details>
<details>
  <summary>Rspack</summary>

In `rspack.config.mjs`:

```ts
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@rspack/cli'
import dts from 'unplugin-dts/rspack'

const rootDir = resolve(fileURLToPath(import.meta.url), '..')

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  output: {
    path: resolve(rootDir, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                },
              },
            },
          },
        ],
      },
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  decorators: true,
                },
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [dts()],
})

```

</details>
<details>
  <summary>Esbuild</summary>

In your build script:

```ts
import { build } from 'esbuild'
import dts from 'unplugin-dts/esbuild'

await build({
  entryPoints: ['src/index.ts'],
  format: 'esm',
  outdir: 'dist',
  bundle: true,
  plugins: [dts()],
})
```

</details>

<br />
By default, the generated declaration files are following the source structure.

Fortunately, with the help of [API Extractor](https://api-extractor.com/), the plugin can bundle all types into a single file. You just need to install `@microsoft/api-extractor` and set `bundleTypes: true`:

```sh
pnpm i -D @microsoft/api-extractor
```

```ts
{
  plugins: [dts({ bundleTypes: true })]
}
```

If you start with official Vite template, you should specify the `tsconfigPath`:

```ts
{
  plugins: [dts({ tsconfigPath: './tsconfig.app.json' })]
}
```

One more, if you are using it in a **Vue project**, you need to install `@vue/language-core` as a peer dependency for the plugin:

```sh
pnpm i -D @vue/language-core
```

## Example

A real project using this plugin: [Vexip UI](https://github.com/vexip-ui/vexip-ui).

## License

MIT License.

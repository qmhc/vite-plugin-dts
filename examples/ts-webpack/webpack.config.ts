import { resolve } from 'node:path'

import dts from '../../packages/unplugin-dts/src/webpack'

import type { Configuration } from 'webpack'

export default {
  entry: {
    index: './src/index.ts',
    main: './src/main.ts',
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: (data) => {
      return `${data.runtime || data.chunk?.name || 'index'}.js`
    },
    library: 'Test',
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
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
  mode: 'production',
  plugins: [
    dts({
      outDirs: ['dist', 'types'],
      // include: ['src/index.ts'],
      exclude: ['src/ignore'],
      // aliasesExclude: [/^@components/],
      staticImport: true,
      // insertTypesEntry: true,
      // bundleTypes: true,
      // declarationOnly: true,
      compilerOptions: {
        declarationMap: true,
      },
    }),
  ],
} satisfies Configuration

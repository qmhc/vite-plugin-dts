# [1.0.0-beta.0](https://github.com/qmhc/vite-plugin-dts/compare/v4.5.4...v1.0.0-beta.0) (2025-05-18)


### Code Refactoring

* switch to use unplugin & adjust options ([#426](https://github.com/qmhc/vite-plugin-dts/issues/426)) ([dfe2a9b](https://github.com/qmhc/vite-plugin-dts/commit/dfe2a9bcdeb2a93078da95f22cd06065bccef1a5))


### BREAKING CHANGES

* `rollupTypes` -> `bundleTypes`, `bundledPackages` -> `bundleTypes.bundledPackages`, `rollupConfig` -> `bundleTypes.extractorConfig`, `rollupOptions` -> `bundleTypes.invokeOptions`, `logLevel` removed, `@microsoft/api-extractor` now is a peer dependency.




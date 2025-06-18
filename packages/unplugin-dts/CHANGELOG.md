# [1.0.0-beta.2](https://github.com/qmhc/vite-plugin-dts/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2025-06-18)


### Bug Fixes

* correctly use resolve method ([337e43e](https://github.com/qmhc/vite-plugin-dts/commit/337e43e286cc255b255fdec6a0f0822fe3ef6034))



# [1.0.0-beta.1](https://github.com/qmhc/vite-plugin-dts/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2025-06-16)


### Bug Fixes

* correct package.json exports field to fix FalseESM issue ([#431](https://github.com/qmhc/vite-plugin-dts/issues/431)) ([ee407a5](https://github.com/qmhc/vite-plugin-dts/commit/ee407a5a1c5c8a7480bb1e70f624b8ff88dd91d1))



# [1.0.0-beta.0](https://github.com/qmhc/vite-plugin-dts/compare/v4.5.4...v1.0.0-beta.0) (2025-05-18)


### Code Refactoring

* switch to use unplugin & adjust options ([#426](https://github.com/qmhc/vite-plugin-dts/issues/426)) ([dfe2a9b](https://github.com/qmhc/vite-plugin-dts/commit/dfe2a9bcdeb2a93078da95f22cd06065bccef1a5))


### BREAKING CHANGES

* `rollupTypes` -> `bundleTypes`, `bundledPackages` -> `bundleTypes.bundledPackages`, `rollupConfig` -> `bundleTypes.extractorConfig`, `rollupOptions` -> `bundleTypes.invokeOptions`, `logLevel` removed, `@microsoft/api-extractor` now is a peer dependency.




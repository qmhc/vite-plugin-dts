# [1.0.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.10...v1.0.0) (2022-03-22)

### Features

- support entryRoot option ([c939e35](https://github.com/qmhc/vite-plugin-dts/commit/c939e358dfecacaf2dfd2b0d42118c16462c260a)), closes [#59](https://github.com/qmhc/vite-plugin-dts/issues/59)

### BREAKING CHANGES

- The calculating output paths funtion of root option is
  assigned to entryRoot option, and currently will auto calculating the
  smallest public path as the default value for entryRoot option.

## [0.9.10](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.9...v0.9.10) (2022-03-12)

### Bug Fixes

- make default include same as tsconfig.json ([5ca7fc5](https://github.com/qmhc/vite-plugin-dts/commit/5ca7fc51ab321d4b25ce9856c0e52894c1264d44)), closes [#58](https://github.com/qmhc/vite-plugin-dts/issues/58)

## [0.9.9](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.8...v0.9.9) (2022-01-11)

### Bug Fixes

- should filter vite virtual files ([5fb24ba](https://github.com/qmhc/vite-plugin-dts/commit/5fb24ba2c40ad2ef81e45c33533aada3bb5aefd3)), closes [#50](https://github.com/qmhc/vite-plugin-dts/issues/50)

## [0.9.8](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.7...v0.9.8) (2022-01-10)

### Bug Fixes

- put `copyDtsFiles` option in use ([#53](https://github.com/qmhc/vite-plugin-dts/issues/53)) ([261700f](https://github.com/qmhc/vite-plugin-dts/commit/261700f80a60b3bc1f22f391e00d9999205fe0d2)), closes [#52](https://github.com/qmhc/vite-plugin-dts/issues/52)

## [0.9.7](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.6...v0.9.7) (2021-12-30)

### Bug Fixes

- inserted entry not through beforeWriteFile ([e16b9b1](https://github.com/qmhc/vite-plugin-dts/commit/e16b9b15c66df887bac0ca0b6be05e4d1f8628ed)), closes [#48](https://github.com/qmhc/vite-plugin-dts/issues/48)

## [0.9.6](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.5...v0.9.6) (2021-11-23)

### Bug Fixes

- aliases are not resolved when find ends with '/' ([f04aab2](https://github.com/qmhc/vite-plugin-dts/commit/f04aab21f9f6dc02316a9ff3a9cd43e90cd97828)), closes [#37](https://github.com/qmhc/vite-plugin-dts/issues/37)
- not equally transform dts source files ([ede5146](https://github.com/qmhc/vite-plugin-dts/commit/ede514649282aec786549d490e8127824913914c))

## [0.9.5](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.4...v0.9.5) (2021-11-21)

### Bug Fixes

- ensure dts source files through beforeWriteFile hook ([3265412](https://github.com/qmhc/vite-plugin-dts/commit/3265412e26dd8736fefab0cf99e920d01bb246c5)), closes [#43](https://github.com/qmhc/vite-plugin-dts/issues/43)

## [0.9.4](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.3...v0.9.4) (2021-11-10)

### Bug Fixes

- cannot resolve types defined in dts files ([666ca09](https://github.com/qmhc/vite-plugin-dts/commit/666ca0925075bed6926f648a210f37d56af9577b)), closes [#42](https://github.com/qmhc/vite-plugin-dts/issues/42)
- take unused error when using setup-script ([c4145b7](https://github.com/qmhc/vite-plugin-dts/commit/c4145b7352359c79b8ba7c01a1c4afeace4dbc7c))

## [0.9.3](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.2...v0.9.3) (2021-11-03)

### Bug Fixes

- support require for cjs exports ([cc5aff9](https://github.com/qmhc/vite-plugin-dts/commit/cc5aff9b9906fc87f6012fb66566fd1937a9381e)), closes [#39](https://github.com/qmhc/vite-plugin-dts/issues/39)

## [0.9.2](https://github.com/qmhc/vite-plugin-dts/compare/v0.9.1...v0.9.2) (2021-10-20)

### Bug Fixes

- support optional @vue/compiler-sfc ([34e1958](https://github.com/qmhc/vite-plugin-dts/commit/34e19587aa64c802cfbd99c5c8018bde8d0e1e2f))

## [0.9.1](https://github.com/qmhc/vite-plugin-dts/compare/v0.8.3...v0.9.1) (2021-10-18)

# [0.9.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.8.3...v0.9.0) (2021-10-18)

### Bug Fixes

- watch mode not update ts/js files ([32a5699](https://github.com/qmhc/vite-plugin-dts/commit/32a5699a9b4f5a24b2a2a870ced43850a0573f82))

### Features

- add afterBuild hook option ([#34](https://github.com/qmhc/vite-plugin-dts/issues/34)) ([e836689](https://github.com/qmhc/vite-plugin-dts/commit/e83668988dab189d185ed9637032f7f80ba1e4db))
- afterDiagnostic and afterBuild support async ([c92d548](https://github.com/qmhc/vite-plugin-dts/commit/c92d54826b81f50fbb38fa909df730b323b75b24))
- skip diagnostic by default (add skipDiagnostics option) ([8ca3ed3](https://github.com/qmhc/vite-plugin-dts/commit/8ca3ed30dfcc23c2dd9822fe6ef460a6c832dfe2))

## [0.8.3](https://github.com/qmhc/vite-plugin-dts/compare/v0.8.2...v0.8.3) (2021-10-11)

### Bug Fixes

- support tsconfig.json using comments ([6e6e446](https://github.com/qmhc/vite-plugin-dts/commit/6e6e44683592060ebd27d1c5712058f2f0f0aeb6)), closes [#31](https://github.com/qmhc/vite-plugin-dts/issues/31)

## [0.8.2](https://github.com/qmhc/vite-plugin-dts/compare/v0.8.1...v0.8.2) (2021-09-30)

### Bug Fixes

- create correct source for tsx/jsx script ([#29](https://github.com/qmhc/vite-plugin-dts/issues/29)) ([109721e](https://github.com/qmhc/vite-plugin-dts/commit/109721e89007cd702fe73fded44cc6b7efeef46e))

## [0.8.1](https://github.com/qmhc/vite-plugin-dts/compare/v0.8.0...v0.8.1) (2021-09-22)

### Bug Fixes

- declarationDir make no file generated ([3313a19](https://github.com/qmhc/vite-plugin-dts/commit/3313a19da669bda7fa8fff3a5211652bc22e7413)), closes [#27](https://github.com/qmhc/vite-plugin-dts/issues/27)
- rewrite noEmit option when init porject ([735d26b](https://github.com/qmhc/vite-plugin-dts/commit/735d26b3cad9a90dd272a08448d238045306a1ba)), closes [#28](https://github.com/qmhc/vite-plugin-dts/issues/28)

# [0.8.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.7.0...v0.8.0) (2021-09-13)

### Bug Fixes

- adapt vue@3.2.6+ setup script ([1b62755](https://github.com/qmhc/vite-plugin-dts/commit/1b62755947972a67a034830cc7478fa1a65924c4))
- ouput files out of include bounds ([e1cdedf](https://github.com/qmhc/vite-plugin-dts/commit/e1cdedfc8b41a311d2c22674bd132f23242482ac)), closes [#24](https://github.com/qmhc/vite-plugin-dts/issues/24)

### Features

- add afterDiagnostic option ([7d43ece](https://github.com/qmhc/vite-plugin-dts/commit/7d43ece8fcb9b71d645982a45b01cd9136c525d8)), closes [#22](https://github.com/qmhc/vite-plugin-dts/issues/22)
- support build watch mode ([a920d97](https://github.com/qmhc/vite-plugin-dts/commit/a920d97825dced453f5f70d8776944c02b50e14b)), closes [#5](https://github.com/qmhc/vite-plugin-dts/issues/5)

# [0.7.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.6.0...v0.7.0) (2021-08-23)

### Bug Fixes

- support using script-setup alongside script ([39517ad](https://github.com/qmhc/vite-plugin-dts/commit/39517ad7119a4b97be7a2d874b43cb73cfa95f07)), closes [#21](https://github.com/qmhc/vite-plugin-dts/issues/21)

### Features

- add noEmitOnError and logDiagnostics options ([8a840fe](https://github.com/qmhc/vite-plugin-dts/commit/8a840fe2692e07e8e881c58ca8f6887d08493cc9))

# [0.6.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.5.3...v0.6.0) (2021-08-14)

### Bug Fixes

- resolve alias when using default import ([3121d5b](https://github.com/qmhc/vite-plugin-dts/commit/3121d5bd56a6863e5175c95b00d7a3dedc0cff6d)), closes [#20](https://github.com/qmhc/vite-plugin-dts/issues/20)

### Features

- add copyDtsFiles option ([bdab8c4](https://github.com/qmhc/vite-plugin-dts/commit/bdab8c4b4efa894209c2edeffbbe4d79680eafe9)), closes [#19](https://github.com/qmhc/vite-plugin-dts/issues/19)

## [0.5.3](https://github.com/qmhc/vite-plugin-dts/compare/v0.5.2...v0.5.3) (2021-07-22)

### Bug Fixes

- add allowJs option dynamically ([36f8de2](https://github.com/qmhc/vite-plugin-dts/commit/36f8de28c68cd52945faeb375cd2931c6ad0468a)), closes [#17](https://github.com/qmhc/vite-plugin-dts/issues/17)
- add js and jsx files when allowJs ([0e1e6f7](https://github.com/qmhc/vite-plugin-dts/commit/0e1e6f7c09c85e169568b2c77c66d452d04a28a2))

## [0.5.2](https://github.com/qmhc/vite-plugin-dts/compare/v0.5.1...v0.5.2) (2021-07-01)

### Bug Fixes

- cannot require @vue/compiler-sfc in monorepo ([fd9b5c1](https://github.com/qmhc/vite-plugin-dts/commit/fd9b5c1c018feb87e374cdf6671b7b8be14e775b)), closes [#14](https://github.com/qmhc/vite-plugin-dts/issues/14)

## [0.5.1](https://github.com/qmhc/vite-plugin-dts/compare/v0.5.0...v0.5.1) (2021-06-18)

### Bug Fixes

- support insert entry from '.tsx' file ([e38b7c4](https://github.com/qmhc/vite-plugin-dts/commit/e38b7c4686a8d7405583a97078e97fbef4757da6))

# [0.5.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.4.3...v0.5.0) (2021-06-15)

### Bug Fixes

- ignore none export files ([f9c41bc](https://github.com/qmhc/vite-plugin-dts/commit/f9c41bc4e2fd498b53aa366a5f8f2a57589b6176))
- rename insertIndexEntry to insertTypesEntry ([c9d392e](https://github.com/qmhc/vite-plugin-dts/commit/c9d392ec3def98b541bb597c5ed38933b225fe5e))

### Features

- add clearPureImport option ([0357f69](https://github.com/qmhc/vite-plugin-dts/commit/0357f69485204f24d9830a4de59558a23eb66e19))
- defaults insert entry base on pkg.types ([9c71f28](https://github.com/qmhc/vite-plugin-dts/commit/9c71f28eac50d23a42d92bd79ac6d09f1be0544d))
- optional insert index type entry ([592a701](https://github.com/qmhc/vite-plugin-dts/commit/592a701d6213f955306df9de0c7f1d3243a28faa))

## [0.4.3](https://github.com/qmhc/vite-plugin-dts/compare/v0.4.2...v0.4.3) (2021-06-11)

### Bug Fixes

- back off optional chaining and nullish coalescing ([8e09129](https://github.com/qmhc/vite-plugin-dts/commit/8e09129c1600a013a2c3c50983ab7f358216757f)), closes [#2](https://github.com/qmhc/vite-plugin-dts/issues/2)
- transform fs/promise to fs-extra ([1794b0b](https://github.com/qmhc/vite-plugin-dts/commit/1794b0b93baf4212b4efc5ef06a697adf70e4933)), closes [#4](https://github.com/qmhc/vite-plugin-dts/issues/4)

### Performance Improvements

- use menory result generate bundle ([858bf31](https://github.com/qmhc/vite-plugin-dts/commit/858bf317d16c995feb73e53339d61f7602e36484))

## [0.4.2](https://github.com/qmhc/vite-plugin-dts/compare/v0.4.1...v0.4.2) (2021-06-09)

### Bug Fixes

- incomplete remove pure import ([a1fd54e](https://github.com/qmhc/vite-plugin-dts/commit/a1fd54e769f1b50ee5858d33879b2a6732625797))
- mamual set include and exclude ([b6fb510](https://github.com/qmhc/vite-plugin-dts/commit/b6fb5106206df9de83276687dd1451fa3d882067))
- more accurate normalize glob ([1d65c47](https://github.com/qmhc/vite-plugin-dts/commit/1d65c47811344a6b566a8dcf22cd22d9298d5a02))
- set rootDir if not set in compilerOptions ([a1d83d2](https://github.com/qmhc/vite-plugin-dts/commit/a1d83d2aa56a32ebef11b9d98fa508a6d9fbd412)), closes [#3](https://github.com/qmhc/vite-plugin-dts/issues/3)
- transform alias include dynamic imports ([a6919b4](https://github.com/qmhc/vite-plugin-dts/commit/a6919b4760cf5cbefbdad1ac674b8a8275dc27dd))

## [0.4.1](https://github.com/qmhc/vite-plugin-dts/compare/v0.4.0...v0.4.1) (2021-06-08)

### Bug Fixes

- dynamic import regexp endings include ']' and ')' ([e5f37a6](https://github.com/qmhc/vite-plugin-dts/commit/e5f37a6d9e232e268ea1b2ec2eadb6c7bc7d7115))

# [0.4.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.3.5...v0.4.0) (2021-06-08)

### Bug Fixes

- bundle only once for multiple formats ([be37fbf](https://github.com/qmhc/vite-plugin-dts/commit/be37fbfcbd03dd23c73908a2d7f2d019437e003a))

### Features

- bundle all from tsconfig include ([252554a](https://github.com/qmhc/vite-plugin-dts/commit/252554af1fa403af1ee00dba16a1c7938e7374c6))

### BREAKING CHANGES

- Deprecated include and exclude options, it will be resolved through tsconfig.json now.

## [0.3.5](https://github.com/qmhc/vite-plugin-dts/compare/v0.3.4...v0.3.5) (2021-06-07)

### Bug Fixes

- includes prue type export files ([1341359](https://github.com/qmhc/vite-plugin-dts/commit/1341359b9943fd961ec0d3d40d71252e77c73390))
- incorrect path in transform alias ([d686ff9](https://github.com/qmhc/vite-plugin-dts/commit/d686ff94157c400d7f235331a47fbb9d452afeb9))

## [0.3.4](https://github.com/qmhc/vite-plugin-dts/compare/v0.3.3...v0.3.4) (2021-06-07)

### Bug Fixes

- remove pure import ([fe241de](https://github.com/qmhc/vite-plugin-dts/commit/fe241de5b583cb5bf2dde83383a8a43e53724ce1))
- static import include relative path ([4065217](https://github.com/qmhc/vite-plugin-dts/commit/40652178b9071509269e6b66cbbbcb3562cf349d))

## [0.3.3](https://github.com/qmhc/vite-plugin-dts/compare/v0.3.2...v0.3.3) (2021-06-07)

### Bug Fixes

- keep output relative to root not to entry dir ([e83ec64](https://github.com/qmhc/vite-plugin-dts/commit/e83ec643536f888166055a5495db3e2fd1030584))

### BREAKING CHANGES

- Ouput declaration structure no longer relative to entry dir

## [0.3.2](https://github.com/qmhc/vite-plugin-dts/compare/v0.3.1...v0.3.2) (2021-06-07)

### Bug Fixes

- default root base on vite config ([787ebc1](https://github.com/qmhc/vite-plugin-dts/commit/787ebc175d07370628589a6fc73e325b29655a0b))

## [0.3.1](https://github.com/qmhc/vite-plugin-dts/compare/v0.3.0...v0.3.1) (2021-06-06)

### Bug Fixes

- vue file explicit type lost ([d0d8803](https://github.com/qmhc/vite-plugin-dts/commit/d0d88038fb51d71dfb71ab4d0223600801d50349))

# [0.3.0](https://github.com/qmhc/vite-plugin-dts/compare/v0.2.0...v0.3.0) (2021-06-06)

### Bug Fixes

- transform alias import to relative path ([6d5a2d5](https://github.com/qmhc/vite-plugin-dts/commit/6d5a2d5b5ba691b5572727cbf42b340d05964951))

### Features

- projectOptions refine to compilerOptions and tsConfigFilePath ([eb61113](https://github.com/qmhc/vite-plugin-dts/commit/eb611135446fff7bc82e3bd0d1d2b856a829de98))

### BREAKING CHANGES

- projectOptions no longer supported, the project init should be up to the plugin.

# 0.2.0 (2021-06-05)

### Features

- add beforeWriteFile hook ([139e818](https://github.com/qmhc/vite-plugin-dts/commit/139e818cecfa80d4208b3f5ced55e7db57bf7e52))
- add outputDir option ([f289723](https://github.com/qmhc/vite-plugin-dts/commit/f289723672279795c0b96aaac3abf83dd8913b20))
- add transform dynamic import to static ([b2f0c0a](https://github.com/qmhc/vite-plugin-dts/commit/b2f0c0aa6eea5b48703248eca3294c5d845404ba))

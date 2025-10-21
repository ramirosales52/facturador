/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'com.facturador.app',
  productName: 'Facturador',
  directories: {
    output: 'dist/electron',
  },
  publish: null,
  npmRebuild: false,
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  files: [
    'dist/main/**/*',
    'dist/preload/**/*',
    'dist/render/**/*',
    'package.json',
    '.env.example',
    {
      from: 'src/render/assets',
      to: 'assets',
      filter: ['**/*'],
    },
    {
      from: 'node_modules',
      to: 'node_modules',
      filter: [
        '**/*',
      ],
    },
  ],
  win: {
    target: 'nsis',
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  extraMetadata: {
    main: 'dist/main/index.js',
  },
}

module.exports = config

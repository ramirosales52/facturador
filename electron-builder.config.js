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
  // Comprimir con asar para reducir tamaño
  asar: true,
  asarUnpack: [
    '.env',
    'node_modules/.cache/puppeteer/**/*',
    'node_modules/puppeteer/.local-chromium/**/*',
    'assets/**/*',
  ],
  files: [
    'dist/main/**/*',
    'dist/preload/**/*',
    'dist/render/**/*',
    'package.json',
    '.env',
    '!**/*.map',
    '!**/README.md',
    '!**/LICENSE*',
    '!**/CHANGELOG.md',
    '!**/*.d.ts',
    '!**/test/**',
    '!**/tests/**',
    '!**/*.spec.js',
    '!**/*.test.js',
    '!**/docs/**',
    '!**/example/**',
    '!**/examples/**',
    '!**/.github/**',
    {
      from: 'node_modules/puppeteer/.local-chromium',
      to: 'node_modules/puppeteer/.local-chromium',
      filter: ['**/*'],
    },
    {
      from: 'src/render/assets',
      to: 'assets',
      filter: ['**/*'],
    },
    {
      from: 'node_modules',
      to: 'node_modules',
      filter: [
        // Backend dependencies
        '@afipsdk/**/*',
        '@nestjs/common/**/*',
        '@nestjs/core/**/*',
        '@nestjs/mapped-types/**/*',
        '@nestjs/microservices/**/*',
        '@nestjs/platform-express/**/*',
        '@doubleshot/nest-electron/**/*',
        'axios/**/*',
        'class-transformer/**/*',
        'class-validator/**/*',
        'reflect-metadata/**/*',
        'rxjs/**/*',

        // Puppeteer (generación de PDF)
        'puppeteer/**/*',
        'puppeteer-core/**/*',
        '@puppeteer/**/*',
        '.cache/puppeteer/**/*',
        '.local-chromium/**/*',

        // Frontend (solo producción)
        'react/**/*',
        'react-dom/**/*',
        'react-router/**/*',

        // Excluir archivos innecesarios
        '!**/*.map',
        '!**/README.md',
        '!**/LICENSE*',
        '!**/CHANGELOG.md',
        '!**/*.d.ts',
        '!**/test/**',
        '!**/tests/**',
        '!**/*.spec.js',
        '!**/*.test.js',
        '!**/docs/**',
        '!**/example/**',
        '!**/examples/**',
        '!**/.github/**',
      ],
    },
  ],
  win: {
    target: [{
      target: 'nsis',
      arch: ['x64']
    }],
    icon: 'src/render/assets/ARCA_icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    differentialPackage: true,
  },
  extraMetadata: {
    main: 'dist/main/index.js',
  },
  // Comprimir al máximo
  compression: 'maximum',
}

module.exports = config
